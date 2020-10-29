import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import jinroModule = require("../../../modules/jinro");

export const handleGroupPostback = async (
	postbackData: string,
	jinro: jinroModule.Jinro,
	userId: string,
	replyToken: string
): Promise<void> => {
	const userIndex: number = await jinro.getUserIndexFromUserId(userId);
	const player: jinroModule.Player = jinro.players[userIndex];
	const status: string = jinro.gameStatus;

	if (status == "action" && jinro.day == 0) {
		// await jinro.setAction();
		if (postbackData == "確認状況") {
			await replyConfirmStatus(jinro, replyToken);
		}
	}

	if (status == "discuss") {
		await jinro.setDiscussion();
		if (postbackData == "残り時間") {
			return replyRemainingTime(jinro, replyToken);
		}
	}

	if (status == "vote") {
		// await jinro.setVote();

		if (!player.isReady) {
			// postbackした参加者の投票がまだの場合

			const votedUserIndex = Number(postbackData);
			// TODO: これなに？
			// const isUserCandidate: boolean = await jinro.vote.isUserCandidate(votedUserIndex);
			const isUserCandidate = true;
			if (isUserCandidate) {
				// postbackのデータが候補者のインデックスだった場合

				// ※
				if (userIndex != votedUserIndex) {
					// 自分以外に投票していた場合
					return replyVoteSuccess(jinro, votedUserIndex, userIndex, replyToken);
				} else {
					// 自分に投票していた場合
					return replySelfVote(replyToken);
				}
			}
		} else {
			return replyDuplicateVote(jinro, userIndex, replyToken);
		}
	}
};

const replyConfirmStatus = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
	const displayNames = await jinro.getDisplayNames();
	// const confirmStatus = jinro.action.actionStatus;
	const unconfirmed = [];
	const players = jinro.players;
	for (let i = 0; i < displayNames.length; i++) {
		if (!players[i].isReady) {
			unconfirmed.push(displayNames[i]);
		}
	}

	const replyMessage = await import("../templates/replyConfirmStatus");
	await dabyss.replyMessage(replyToken, await replyMessage.main(unconfirmed));
};

const replyRemainingTime = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
	const remainingTime = await jinro.discussion.getRemainingTime();

	const replyMessage = await import("../templates/replyRemainingTime");
	await dabyss.replyMessage(replyToken, await replyMessage.main(remainingTime));
};

const replyVoteSuccess = async (
	jinro: jinroModule.Jinro,
	votedUserIndex: number,
	userIndex: number,
	replyToken: string
): Promise<void> => {
	const promises: Promise<void>[] = [];
	const player: jinroModule.Player = jinro.players[userIndex];

	const voterDisplayName = await jinro.getDisplayName(userIndex);
	await player.vote(jinro.day, votedUserIndex);
	let replyMessage: line.Message[] = [];

	const replyVoteSuccess = await import("../templates/replyVoteSuccess");
	replyMessage = replyMessage.concat(await replyVoteSuccess.main(voterDisplayName));
	if (await jinro.isAllMembersGetReady()) {
		// いつかは下2行を統合する
		const mostPolledPlayers: jinroModule.Player[] = await jinro.getMostPolledPlayers();
		const mostPolledPlayersIndexes: number[] = await jinro.getMostPolledPlayersIndexes();
		let isVoteFinish;
		if (mostPolledPlayers.length == 1) {
			// 最多得票者が一人だった場合
			const executedPlayer: jinroModule.Player = mostPolledPlayers[0];
			const replyExecutor = await import("../templates/replyExecutor");
			const replyExecutorMessage = await replyExecutor.main(executedPlayer.displayName);
			replyMessage = replyMessage.concat(replyExecutorMessage);
			await executedPlayer.die();
			isVoteFinish = true;
		} else {
			// 最多得票者が複数いた場合
			if ((await jinro.getRevotingCount()) == 1) {
				// 一回目の投票の場合
				isVoteFinish = false;
				const replyRevote = await import("../templates/replyRevote");
				const displayNames: string[] = [];
				for (let i = 0; mostPolledPlayersIndexes.length; i++) {
					displayNames.push(jinro.players[mostPolledPlayersIndexes[i]].displayName);
				}
				const replyRevoteMessage = await replyRevote.main(mostPolledPlayersIndexes, displayNames);
				replyMessage = replyMessage.concat(replyRevoteMessage);
				// promises.push(jinro.putRevote());
			} else {
				// 再投票中だった場合
				const executedPlayer: jinroModule.Player = await jinro.chooseExecutedPlayerRandomly(mostPolledPlayers);
				const replyExecutorInRevote = await import("../templates/replyExecutorInRevote");
				const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executedPlayer.displayName);
				replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);
				await executedPlayer.die();
				isVoteFinish = true;
			}
		}

		if (isVoteFinish) {
			if (await jinro.isCitizenWin()) {
				replyMessage = replyMessage.concat(await replyCitizenWin(jinro));
			} else if (await jinro.isWerewolfWin()) {
				replyMessage = replyMessage.concat(await replyBiteCompleted(jinro));
			} else {
				replyMessage = replyMessage.concat(await replyVoteFinish(jinro));
			}
		}
	}

	promises.push(dabyss.replyMessage(replyToken, replyMessage));
	await Promise.all(promises);
	return;
};

const replyVoteFinish = async (jinro: jinroModule.Jinro): Promise<line.Message[]> => {
	const promises: Promise<void>[] = [];

	promises.push(jinro.updateGameStatus("action")); // ステータスをアクション中に
	// TODO: これなに
	promises.push(jinro.putAction());
	const players = jinro.players;
	for (let i = 0; i < jinro.userIds.length; i++) {
		const player = players[i];
		if (player.isAlive) {
			const targetAliveDisplayNames = await jinro.getAliveDisplayNamesExceptOneself(player);
			const targetDeadDisplayNames = await jinro.getDeadDisplayNames();
			const aliveIndexes = await jinro.getAliveUserIndexesExceptOneself(player);
			const deadIndexes = await jinro.getDeadIndexes();

			const pushUserAction = await import("../templates/pushUserAction");
			promises.push(
				dabyss.pushMessage(
					player.userId,
					await pushUserAction.main(
						player.displayName,
						player.position,
						player.isAlive,
						targetAliveDisplayNames,
						targetDeadDisplayNames,
						aliveIndexes,
						deadIndexes
					)
				)
			);
		}
	}

	const replyVoteFinish = await import("../templates/replyVoteFinish");
	const replyVoteFinishMessage = await replyVoteFinish.main(jinro.day);

	await Promise.all(promises);
	return replyVoteFinishMessage;
};

const replyBiteCompleted = async (jinro: jinroModule.Jinro): Promise<line.Message[]> => {
	await jinro.updateGameStatus("winner");
	await jinro.updateWinner("werewolf");
	const winnerIndexes = await jinro.getWinnerIndexes();

	const displayNames = await jinro.getDisplayNames();
	const replyWinner = await import("../templates/replyWinner");
	return await replyWinner.main(displayNames, true, winnerIndexes);
};

const replyCitizenWin = async (jinro: jinroModule.Jinro): Promise<line.Message[]> => {
	await jinro.updateGameStatus("winner"); // 勝者発表状況をtrueにする
	const winnerIndexes = await jinro.getWinnerIndexes();

	const displayNames = await jinro.getDisplayNames();
	const replyWinner = await import("../templates/replyWinner");
	return await replyWinner.main(displayNames, false, winnerIndexes);
};

const replySelfVote = async (replyToken: string): Promise<void> => {
	const replyMessage = await import("../templates/replySelfVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main());
};

const replyDuplicateVote = async (jinro: jinroModule.Jinro, userIndex: number, replyToken: string): Promise<void> => {
	const displayName = await jinro.getDisplayName(userIndex);
	const replyMessage = await import("../templates/replyDuplicateVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};
