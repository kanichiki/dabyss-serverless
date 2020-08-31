import line = require("@line/bot-sdk");
import wordwolf = require("../../../../modules/wordwolf");

export const main = async (wolfNumberOptions: number[]): Promise<line.FlexMessage> => {
	return {
		type: "flex",
		altText: "ウルフの人数候補",
		contents: await wordwolf.wolfNumberMessage(wolfNumberOptions),
	};
};
