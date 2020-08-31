import line = require("@line/bot-sdk");
import wordwolf = require("../../../../modules/wordwolf");

export const main = async (
	userNumber: number,
	depth: number,
	wolfNumber: number,
	lunaticNumber: number,
	timerString: string
): Promise<line.FlexMessage> => {
	return {
		type: "flex",
		altText: "設定確認",
		contents: await wordwolf.settingConfirmMessage(userNumber, depth, wolfNumber, lunaticNumber, timerString),
	};
};
