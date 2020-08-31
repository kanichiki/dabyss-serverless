import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import wordwolf = require("../../../modules/wordwolf");

process.on("uncaughtException", function (err) {
	console.log(err);
});

exports.handler = async (event: any): Promise<void> => {
	const lineEvent: line.PostbackEvent = event.Input.event;
	console.log(lineEvent);

	const replyToken: string = lineEvent.replyToken;
	const postback: line.Postback = lineEvent.postback;
	let time!: string;
	if (postback.params != undefined) {
		if (postback.params.time != undefined) {
			time = postback.params.time;
		}
	}
	const source: line.EventSource = lineEvent.source;

	let groupId!: string;
	if (source.type == "group") {
		groupId = source.groupId;
	} else if (source.type == "room") {
		groupId = source.roomId; // roomIdもgroupId扱いしよう
	}

	const wordWolf: wordwolf.WordWolf = await wordwolf.WordWolf.createInstance(groupId);
	const status: string = wordWolf.gameStatus;

	if (status == "setting") {
		const settingNames = wordWolf.settingNames;
		const settingStatus = wordWolf.settingStatus;
		for (let i = 0; i < settingNames.length; i++) {
			if (!settingStatus[i]) {
				if (settingNames[i] == "timer") {
					return replyTimerChosen(wordWolf, time, replyToken);
				}
			}
		}
	}
};

const replyTimerChosen = async (wordWolf: wordwolf.WordWolf, time: string, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const settingIndex = await wordWolf.getSettingIndex("timer");

	promises.push(wordWolf.updateTimer(time));
	await wordWolf.updateSettingStateTrue(settingIndex);

	promises.push(replyConfirm(wordWolf, replyToken));

	await Promise.all(promises);
	return;
};

const replyConfirm = async (wordWolf: wordwolf.WordWolf, replyToken: string): Promise<void> => {
	const userNumber: number = await wordWolf.getUserNumber();
	const depth: number = wordWolf.depth;
	const wolfNumber: number = wordWolf.wolfIndexes.length;
	const lunaticNumber: number = wordWolf.lunaticIndexes.length;
	const timerString: string = await wordWolf.getTimerString();

	const replyMessage = await import("./template/replyChanged");
	await dabyss.replyMessage(
		replyToken,
		await replyMessage.main(userNumber, depth, wolfNumber, lunaticNumber, timerString)
	);
	return;
};
