import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import jinro_module = require("../../../modules/jinro");

process.on("uncaughtException", function (err) {
	console.log(err);
});

exports.handler = async (event: any): Promise<void> => {
	const lineEvent: line.PostbackEvent = event.Input.event;
	console.log(lineEvent);

	const replyToken: string = lineEvent.replyToken;
	const postback: line.Postback = lineEvent.postback;
	const postbackData: string = postback.data;
	const source: line.EventSource = lineEvent.source;

	let groupId!: string;
	let userId!: string;
	if (source.type == "group") {
		groupId = source.groupId;
	} else if (source.type == "room") {
		groupId = source.roomId; // roomIdもgroupId扱いしよう
	}

	if (source.userId != undefined) {
		userId = source.userId;
	}

	const jinro: jinro_module.Jinro = await jinro_module.Jinro.createInstance(groupId);
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

const replyConfirmStatus = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
	const displayNames = await jinro.getDisplayNames();
	const confirmStatus = jinro.action.actionStatus;
	const unconfirmed = [];
	for (let i = 0; i < displayNames.length; i++) {
		if (!confirmStatus[i]) {
			unconfirmed.push(displayNames[i]);
		}
	}

	const replyMessage = await import("./template/replyConfirmStatus");
	await dabyss.replyMessage(replyToken, await replyMessage.main(unconfirmed));
};

const replyRemainingTime = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
	const remainingTime = await jinro.discussion.getRemainingTime();

	const replyMessage = await import("./template/replyRemainingTime");
	await dabyss.replyMessage(replyToken, await replyMessage.main(remainingTime));
};

const replyVoteSuccess = async (
	jinro: jinro_module.Jinro,
	votedUserIndex: number,
	userIndex: number,
	replyToken: string
): Promise<void> => {
	const promises: Promise<void>[] = [];

	const voterDisplayName = await jinro.getDisplayName(userIndex);

	await jinro.vote.vote(userIndex, votedUserIndex);

	let replyMessage: line.Message[] = [];

	const replyVoteSuccess = await import("./template/replyVoteSuccess");
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

			const replyExecutor = await import("./template/replyExecutor");
			const replyExecutorMessage = await replyExecutor.main(executorDisplayName);
			replyMessage = replyMessage.concat(replyExecutorMessage);
		} else {
			// 最多得票者が複数いた場合
			const mostVotedUserIndexes = await jinro.vote.getMostPolledUserIndexes(); // 最多得票者の配列
			const isRevoting = jinro.vote.count > 1;
			if (!isRevoting) {
				// 一回目の投票の場合
				isVoteFinish = false;

				const replyRevote = await import("./template/replyRevote");
				const replyRevoteMessage = await replyRevote.main(mostVotedUserIndexes, displayNames);

				replyMessage = replyMessage.concat(replyRevoteMessage);
				promises.push(jinro.putRevote());
			} else {
				// 再投票中だった場合

				executorIndex = await jinro.vote.chooseExecutorRandomly(); // 処刑者をランダムで決定
				executorDisplayName = await jinro.getDisplayName(executorIndex);

				const replyExecutorInRevote = await import("./template/replyExecutorInRevote");
				const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executorDisplayName);
				replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);
			}
		}

		if (isVoteFinish) {
			await jinro.die(executorIndex); // 最多投票者洗脳
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

const replyVoteFinish = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
	const promises: Promise<void>[] = [];

	promises.push(jinro.updateGameStatus("action")); // ステータスをアクション中に

	const displayNames = await jinro.getDisplayNames();
	promises.push(jinro.putAction());
	for (let i = 0; i < jinro.userIds.length; i++) {
		const isAlive = await jinro.isAlive(i);
		if (isAlive) {
			const targetAliveDisplayNames = await jinro.getAliveDisplayNamesExceptOneself(i);
			const targetDeadDisplayNames = await jinro.getDeadDisplayNamesExceptOneself(i);
			const aliveIndexes = await jinro.getAliveUserIndexesExceptOneself(i);
			const deadIndexes = await jinro.getDeadIndexes();

			const pushUserAction = await import("./template/pushUserAction");
			promises.push(
				dabyss.pushMessage(
					jinro.userIds[i],
					await pushUserAction.main(
						displayNames[i],
						jinro.positions[i],
						isAlive,
						targetAliveDisplayNames,
						targetDeadDisplayNames,
						aliveIndexes,
						deadIndexes
					)
				)
			);
		}
	}

	const replyVoteFinish = await import("./template/replyVoteFinish");
	const replyVoteFinishMessage = await replyVoteFinish.main(jinro.day);

	await Promise.all(promises);
	return replyVoteFinishMessage;
};

const replyBiteCompleted = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
	await jinro.updateGameStatus("winner");
	await jinro.updateWinner("werewolf");
	const winnerIndexes = await jinro.getWinnerIndexes();

	const displayNames = await jinro.getDisplayNames();
	const replyWinner = await import("./template/replyWinner");
	return await replyWinner.main(displayNames, true, winnerIndexes);
};

const replyCitizenWin = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
	await jinro.updateGameStatus("winner"); // 勝者発表状況をtrueにする
	const winnerIndexes = await jinro.getWinnerIndexes();

	const displayNames = await jinro.getDisplayNames();
	const replyWinner = await import("./template/replyWinner");
	return await replyWinner.main(displayNames, false, winnerIndexes);
};

const replySelfVote = async (replyToken: string): Promise<void> => {
	const replyMessage = await import("./template/replySelfVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main());
};

const replyDuplicateVote = async (jinro: jinro_module.Jinro, userIndex: number, replyToken: string): Promise<void> => {
	const displayName = await jinro.getDisplayName(userIndex);
	const replyMessage = await import("./template/replyDuplicateVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};
