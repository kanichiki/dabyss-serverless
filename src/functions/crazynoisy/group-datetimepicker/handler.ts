import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

exports.handler = async (event: any): Promise<void> => {
	const lineEvent: line.PostbackEvent = event.Input.event;
	console.log(lineEvent);

	const replyToken: string = lineEvent.replyToken;
	const postback: line.Postback = lineEvent.postback;
	const time: string = postback.params.time;

	let groupId!: string;
	if (lineEvent.source.type == "group") {
		groupId = lineEvent.source.groupId;
	} else if (lineEvent.source.type == "room") {
		groupId = lineEvent.source.roomId; // roomIdもgroupId扱いしよう
	}

	const crazyNoisy: crazynoisy.CrazyNoisy = await crazynoisy.CrazyNoisy.createInstance(groupId);
	const status: string = crazyNoisy.gameStatus;

	if (status == "setting") {
		const settingNames = crazyNoisy.settingNames;
		const settingStatus = crazyNoisy.settingStatus;
		for (let i = 0; i < settingNames.length; i++) {
			if (!settingStatus[i]) {
				if (settingNames[i] == "timer") {
					await dabyss.replyTimerChosen(crazyNoisy, time);
					return replyConfirm(crazyNoisy, replyToken);
				}
			}
		}
	}
};

const replyConfirm = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const userNumber = await crazyNoisy.getUserNumber();
	const mode = crazyNoisy.gameMode;
	const type = crazyNoisy.talkType;
	const timer = await crazyNoisy.getTimerString();
	const zeroGuru = crazyNoisy.zeroGuru;
	const zeroDetective = crazyNoisy.zeroDetective;

	const replyMessage = await import("./template/replyChanged");
	promises.push(
		dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, mode, type, timer, zeroGuru, zeroDetective))
	);

	await Promise.all(promises);
	return;
};
