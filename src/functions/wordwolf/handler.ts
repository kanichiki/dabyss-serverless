import line = require("@line/bot-sdk");
import branches = require("./branches");

export const handler = async (lineEvent: line.MessageEvent | line.PostbackEvent) => {
	console.log(lineEvent);
	const replyToken = lineEvent.replyToken;

	const userId: string = lineEvent.source.userId;
	if (lineEvent.source.type == "group" || lineEvent.source.type == "room") {
		let groupId!: string;
		if (lineEvent.source.type == "group") {
			groupId = lineEvent.source.groupId;
		} else if (lineEvent.source.type == "room") {
			groupId = lineEvent.source.roomId; // roomIdもgroupId扱いします
		}
		if (lineEvent.type == "message") {
			if (lineEvent.message.type == "text") {
				// テキストメッセージイベントなら
				const text: string = lineEvent.message.text;

				await branches.handleGroupMessage(text, groupId, replyToken);
			}
		}
		if (lineEvent.type == "postback") {
			const postback: line.Postback = lineEvent.postback;
			if (postback.params != undefined) {
				if (postback.params.time != undefined) {
					const time = postback.params.time;
					await branches.handleGroupDatetimePicker(time, groupId, replyToken);
				}
			} else {
				await branches.handleGroupPostback(postback.data, groupId, userId, replyToken);
			}
		}
	}

	return;
};
