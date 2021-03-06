import dabyss = require("../../modules/dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";

exports.handler = async (): Promise<void> => {
	const promises: Promise<void>[] = [];
	const discussionTable = process.env.discussionTable;
	const secondaryIndex = "is_discussing-game_id-index";
	const data: DocumentClient.QueryOutput = await dabyss.dynamoQuerySecondaryIndex(
		discussionTable,
		secondaryIndex,
		"is_discussing",
		"discussing"
	);
	if (data.Items != undefined) {
		for (const item of data.Items) {
			const discussion = await dabyss.Discussion.createInstance(item.game_id, item.day, item.group_id);
			const game = await dabyss.Game.createInstance(item.group_id);
			const remainingTime: dabyss.Interval = await dabyss.getRemainingTime(discussion.endTime);
			if (remainingTime.hours < 0 && discussion.isDiscussing == "discussing") {
				promises.push(discussion.updateIsDiscussingFalse());
				promises.push(game.putFirstVote());
				promises.push(game.updateGameStatus("vote"));

				const userNumber: number = await game.getUserNumber();
				const shuffleUserIndexes: number[] = await dabyss.makeShuffleNumberArray(userNumber);
				const displayNames = await game.getDisplayNames();

				//if (usePostback) { // postbackを使う設定の場合
				const replyMessage = await import("./template/replyDiscussFinish");
				promises.push(
					dabyss.pushMessage(game.groupId, await replyMessage.main(shuffleUserIndexes, displayNames))
				);
			}
		}
	}
	await Promise.all(promises);
	return;
};
