import line = require("@line/bot-sdk");
import wordwolf = require("../../../../modules/wordwolf");

export const main = async (): Promise<line.FlexMessage> => {
	return {
		type: "flex",
		altText: "議論時間変更",
		contents: await wordwolf.timerMessage(),
	};
};
