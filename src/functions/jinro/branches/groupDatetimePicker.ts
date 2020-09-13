import dabyss = require("../../../modules/dabyss");
import jinroModule = require("../../../modules/jinro");

export const handleGroupDatetimePicker = async (
	time: string,
	jinro: jinroModule.Jinro,
	replyToken: string
): Promise<void> => {
	const status: string = jinro.gameStatus;

	if (status == "setting") {
		const settingNames = jinro.settingNames;
		const settingStatus = jinro.settingStatus;
		for (let i = 0; i < settingNames.length; i++) {
			if (!settingStatus[i]) {
				if (settingNames[i] == "timer") {
					return replyTimerChosen(jinro, time, replyToken);
				}
			}
		}
	}
};

const replyTimerChosen = async (jinro: jinroModule.Jinro, time: string, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const settingIndex = await jinro.getSettingIndex("timer");

	promises.push(jinro.updateTimer(time));
	await jinro.updateSettingStateTrue(settingIndex);

	promises.push(replyConfirm(jinro, replyToken));

	await Promise.all(promises);
	return;
};

const replyConfirm = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const userNumber = await jinro.getUserNumber();
	const timer = await jinro.getTimerString();
	const replyMessage = await import("../templates/replyChanged");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, timer)));

	await Promise.all(promises);
	return;
};
