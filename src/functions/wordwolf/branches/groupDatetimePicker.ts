import dabyss = require("../../../modules/dabyss");
import wordwolf = require("../../../modules/wordwolf");

export const handleGroupDatetimePicker = async (time: string, groupId: string, replyToken: string): Promise<void> => {
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

	const replyMessage = await import("../templates/replyChanged");
	await dabyss.replyMessage(
		replyToken,
		await replyMessage.main(userNumber, depth, wolfNumber, lunaticNumber, timerString)
	);
	return;
};
