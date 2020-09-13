import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

export const handleGroupPostback = async (
	postbackData: string,
	crazyNoisy: crazynoisy.CrazyNoisy,
	userId: string,
	replyToken: string
): Promise<void> => {
	const status: string = crazyNoisy.gameStatus;

	if (status == "action" && crazyNoisy.day == 0) {
		await crazyNoisy.setAction();
		if (postbackData == "確認状況") {
			await replyConfirmStatus(crazyNoisy, replyToken);
		}
	}

	if (status == "discuss") {
		await crazyNoisy.setDiscussion();
		if (postbackData == "残り時間") {
			return replyRemainingTime(crazyNoisy, replyToken);
		}
	}

	if (status == "vote") {
		await crazyNoisy.setVote();

		const userIndex: number = await crazyNoisy.getUserIndexFromUserId(userId);
		const voteState: boolean = await crazyNoisy.vote.isVotedUser(userIndex);
		if (!voteState) {
			// postbackした参加者の投票がまだの場合

			const votedUserIndex = Number(postbackData);
			const isUserCandidate: boolean = await crazyNoisy.vote.isUserCandidate(votedUserIndex);
			if (isUserCandidate) {
				// postbackのデータが候補者のインデックスだった場合

				// ※
				if (userIndex != votedUserIndex) {
					// 自分以外に投票していた場合
					return replyVoteSuccess(crazyNoisy, votedUserIndex, userIndex, replyToken);
				} else {
					// 自分に投票していた場合
					return replySelfVote(replyToken);
				}
			}
		} else {
			return replyDuplicateVote(crazyNoisy, userIndex, replyToken);
		}
	}
};

const replyConfirmStatus = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const displayNames = await crazyNoisy.getDisplayNames();
	const confirmStatus = crazyNoisy.action.actionStatus;
	const unconfirmed = [];
	for (let i = 0; i < displayNames.length; i++) {
		if (!confirmStatus[i]) {
			unconfirmed.push(displayNames[i]);
		}
	}

	const replyMessage = await import("../templates/replyConfirmStatus");
	await dabyss.replyMessage(replyToken, await replyMessage.main(unconfirmed));
};

const replyRemainingTime = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const remainingTime = await crazyNoisy.discussion.getRemainingTime();

	const replyMessage = await import("../templates/replyRemainingTime");
	await dabyss.replyMessage(replyToken, await replyMessage.main(remainingTime));
};

const replyVoteSuccess = async (
	crazyNoisy: crazynoisy.CrazyNoisy,
	votedUserIndex: number,
	userIndex: number,
	replyToken: string
): Promise<void> => {
	const promises: Promise<void>[] = [];

	const voterDisplayName = await crazyNoisy.getDisplayName(userIndex);

	await crazyNoisy.vote.vote(userIndex, votedUserIndex);

	let replyMessage: line.Message[] = [];

	const replyVoteSuccess = await import("../templates/replyVoteSuccess");
	replyMessage = replyMessage.concat(await replyVoteSuccess.main(voterDisplayName));

	const isVoteCompleted: boolean = await crazyNoisy.vote.isVoteCompleted();
	if (isVoteCompleted) {
		const displayNames = await crazyNoisy.getDisplayNames();

		const multipleMostVotedUserExists = await crazyNoisy.vote.multipleMostPolledUserExists();
		if (!multipleMostVotedUserExists) {
			// 最多得票者が一人だった場合

			const mostVotedUserIndex = await crazyNoisy.vote.getMostPolledUserIndex(); // 最多得票者
			const executorDisplayName = await crazyNoisy.getDisplayName(mostVotedUserIndex);

			const replyExecutor = await import("../templates/replyExecutor");
			const replyExecutorMessage = await replyExecutor.main(executorDisplayName);
			replyMessage = replyMessage.concat(replyExecutorMessage);

			const isGuru = await crazyNoisy.isGuru(mostVotedUserIndex); // 最多得票者が教祖かどうか

			if (!isGuru) {
				// 最多得票者が教祖じゃなかった場合
				replyMessage = replyMessage.concat(
					await replyExecutorIsNotGuru(crazyNoisy, executorDisplayName, mostVotedUserIndex)
				);

				const isBrainwashCompleted = await crazyNoisy.isBrainwashCompleted();
				if (!isBrainwashCompleted) {
					replyMessage = replyMessage.concat(await replyVoteFinish(crazyNoisy));
				} else {
					// 洗脳が完了したら
					replyMessage = replyMessage.concat(await replyBrainwashCompleted(crazyNoisy));
				}
			} else {
				// 最多得票者が教祖だった場合
				replyMessage = replyMessage.concat(await replyCitizenWin(crazyNoisy));
			}
		} else {
			// 最多得票者が複数いた場合
			const mostVotedUserIndexes = await crazyNoisy.vote.getMostPolledUserIndexes(); // 最多得票者の配列
			const isRevoting = crazyNoisy.vote.count > 1;
			if (!isRevoting) {
				// 一回目の投票の場合

				const replyRevote = await import("../templates/replyRevote");
				const replyRevoteMessage = await replyRevote.main(mostVotedUserIndexes, displayNames);
				replyMessage = replyMessage.concat(replyRevoteMessage);

				// DB変更操作３’，４’
				// 再投票データを作成したら、投票データを初期化する同期処理
				promises.push(crazyNoisy.putRevote());
			} else {
				// 再投票中だった場合

				const executorIndex = await crazyNoisy.vote.chooseExecutorRandomly(); // 処刑者をランダムで決定
				const executorDisplayName = await crazyNoisy.getDisplayName(executorIndex);

				const replyExecutorInRevote = await import("../templates/replyExecutorInRevote");
				const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executorDisplayName);
				replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);

				const isGuru = await crazyNoisy.isGuru(executorIndex); // 最多得票者が教祖かどうか
				if (!isGuru) {
					// 最多得票者が教祖じゃなかった場合
					replyMessage = replyMessage.concat(
						await replyExecutorIsNotGuru(crazyNoisy, executorDisplayName, executorIndex)
					);

					const isBrainwashCompleted = await crazyNoisy.isBrainwashCompleted();
					if (!isBrainwashCompleted) {
						replyMessage = replyMessage.concat(await replyVoteFinish(crazyNoisy));
					} else {
						// 洗脳が完了したら
						replyMessage = replyMessage.concat(await replyBrainwashCompleted(crazyNoisy));
					}
				} else {
					// 最多得票者が教祖だった場合
					replyMessage = replyMessage.concat(await replyCitizenWin(crazyNoisy));
				}
			}
		}
	}
	promises.push(dabyss.replyMessage(replyToken, replyMessage));
	await Promise.all(promises);
	return;
};

const replyExecutorIsNotGuru = async (
	crazyNoisy: crazynoisy.CrazyNoisy,
	executorDisplayName: string,
	executorIndex: number
): Promise<line.Message[]> => {
	const promises: Promise<void>[] = [];
	await crazyNoisy.updateBrainwashStateTrue(executorIndex); // 最多投票者洗脳
	promises.push(crazyNoisy.addCrazinessId(executorIndex)); // 最多投票者狂気追加
	const replyExecutorIsNotGuru = await import("../templates/replyExecutorIsNotGuru");
	const replyExecutorIsNotGuruMessage = await replyExecutorIsNotGuru.main(executorDisplayName);

	await Promise.all(promises);
	return replyExecutorIsNotGuruMessage;
};

const replyVoteFinish = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.updateGameStatus("action")); // ステータスをアクション中に

	const displayNames = await crazyNoisy.getDisplayNames();
	promises.push(crazyNoisy.putAction());
	for (let i = 0; i < crazyNoisy.userIds.length; i++) {
		const targetDisplayNames = await crazyNoisy.getDisplayNamesExceptOneself(i);
		const targetIndexes = await crazyNoisy.getUserIndexesExceptOneself(i);

		const isBrainwash = await crazyNoisy.isBrainwash(i);

		const pushUserAction = await import("../templates/pushUserAction");
		promises.push(
			dabyss.pushMessage(
				crazyNoisy.userIds[i],
				await pushUserAction.main(
					displayNames[i],
					crazyNoisy.positions[i],
					isBrainwash,
					targetDisplayNames,
					targetIndexes
				)
			)
		);
	}
	await Promise.all(promises);

	const replyVoteFinish = await import("../templates/replyVoteFinish");
	return await replyVoteFinish.main(crazyNoisy.day);
};

const replyBrainwashCompleted = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
	await crazyNoisy.updateGameStatus("winner");
	await crazyNoisy.updateWinner("guru");
	const winnerIndexes = await crazyNoisy.getWinnerIndexes();

	const displayNames = await crazyNoisy.getDisplayNames();
	const replyWinner = await import("../templates/replyWinner");
	return await replyWinner.main(displayNames, true, winnerIndexes);
};

const replyCitizenWin = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
	await crazyNoisy.updateGameStatus("winner");
	await crazyNoisy.updateWinner("citizen");
	const winnerIndexes = await crazyNoisy.getWinnerIndexes();
	console.log("勝者:" + winnerIndexes);

	const displayNames = await crazyNoisy.getDisplayNames();
	const replyWinner = await import("../templates/replyWinner");
	return await replyWinner.main(displayNames, false, winnerIndexes);
};

const replySelfVote = async (replyToken: string): Promise<void> => {
	const replyMessage = await import("../templates/replySelfVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main());
};

const replyDuplicateVote = async (
	crazyNoisy: crazynoisy.CrazyNoisy,
	userIndex: number,
	replyToken: string
): Promise<void> => {
	const displayName = await crazyNoisy.getDisplayName(userIndex);
	const replyMessage = await import("../templates/replyDuplicateVote");
	await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};
