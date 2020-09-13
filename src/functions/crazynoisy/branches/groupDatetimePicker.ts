import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

export const handleGroupDatetimePicker = async (
	time: string,
	crazyNoisy: crazynoisy.CrazyNoisy,
	replyToken: string
): Promise<void> => {
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

	const replyMessage = await import("../templates/replyChanged");
	promises.push(
		dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, mode, type, timer, zeroGuru, zeroDetective))
	);

	await Promise.all(promises);
	return;
};
