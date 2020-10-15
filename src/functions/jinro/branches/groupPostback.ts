import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import jinroModule = require("../../../modules/jinro");

export const handleGroupPostback = async (
	postbackData: string,
	jinro: jinroModule.Jinro,
	userId: string,
	replyToken: string
): Promise<void> => {
	const status: string = jinro.gameStatus;

	if (status == "action" && jinro.day == 0) {
		await jinro.setAction();
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
		await jinro.setVote();

		const userIndex: number = await jinro.getUserIndexFromUserId(userId);
		const voteState: boolean = await jinro.vote.isVotedUser(userIndex);
		if (!voteState) {
			// postbackした参加者の投票がまだの場合

			const votedUserIndex = Number(postbackData);
			const isUserCandidate: boolean = await jinro.vote.isUserCandidate(votedUserIndex);
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

	const voterDisplayName = await jinro.getDisplayName(userIndex);

	await jinro.vote.vote(userIndex, votedUserIndex);

	let replyMessage: line.Message[] = [];

	const replyVoteSuccess = await import("../templates/replyVoteSuccess");
	replyMessage = replyMessage.concat(await replyVoteSuccess.main(voterDisplayName));

	const isVoteCompleted: boolean = await jinro.vote.isVoteCompleted();
	if (isVoteCompleted) {
		const displayNames = await jinro.getDisplayNames();

		let isVoteFinish = true;
		let executorIndex = -1;
		let executorDisplayName = "";

		const multipleMostVotedUserExists = await jinro.vote.multipleMostPolledUserExists();
		if (!multipleMostVotedUserExists) {
			// 最多得票者が一人だった場合

			executorIndex = await jinro.vote.getMostPolledUserIndex(); // 最多得票者
			executorDisplayName = await jinro.getDisplayName(executorIndex);

			const replyExecutor = await import("../templates/replyExecutor");
			const replyExecutorMessage = await replyExecutor.main(executorDisplayName);
			replyMessage = replyMessage.concat(replyExecutorMessage);
		} else {
			// 最多得票者が複数いた場合
			const mostVotedUserIndexes = await jinro.vote.getMostPolledUserIndexes(); // 最多得票者の配列
			const isRevoting = jinro.vote.count > 1;
			if (!isRevoting) {
				// 一回目の投票の場合
				isVoteFinish = false;

				const replyRevote = await import("../templates/replyRevote");
				const replyRevoteMessage = await replyRevote.main(mostVotedUserIndexes, displayNames);

				replyMessage = replyMessage.concat(replyRevoteMessage);
				promises.push(jinro.putRevote());
			} else {
				// 再投票中だった場合

				executorIndex = await jinro.vote.chooseExecutorRandomly(); // 処刑者をランダムで決定
				executorDisplayName = await jinro.getDisplayName(executorIndex);

				const replyExecutorInRevote = await import("../templates/replyExecutorInRevote");
				const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executorDisplayName);
				replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);
			}
		}

		if (isVoteFinish) {
			const executedPlayer = jinro.players[executorIndex]
			await executedPlayer.die()
			const isCitizenWin = await jinro.isCitizenWin();
			const isWerewolfWin = await jinro.isWerewolfWin();
			if (isCitizenWin) {
				replyMessage = replyMessage.concat(await replyCitizenWin(jinro));
			} else if (isWerewolfWin) {
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

	const displayNames = await jinro.getDisplayNames();
	// TODO: これなに
	promises.push(jinro.putAction());
	const players = jinro.players;
	for (let i = 0; i < jinro.userIds.length; i++) {
		const player = players[i]
		if (player.isAlive) {
			const targetAliveDisplayNames = await jinro.getAliveDisplayNamesExceptOneself(player);
			const targetDeadDisplayNames = await jinro.getDeadDisplayNamesExceptOneself(player);
			const aliveIndexes = await jinro.getAliveUserIndexesExceptOneself(player);
			const deadIndexes = await jinro.getDeadIndexes(player);

			const pushUserAction = await import("../templates/pushUserAction");
			promises.push(
				dabyss.pushMessage(
					jinro.userIds[i],
					await pushUserAction.main(
						displayNames[i],
						jinro.positions[i],
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
