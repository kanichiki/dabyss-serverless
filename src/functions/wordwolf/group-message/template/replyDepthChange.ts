import line = require("@line/bot-sdk");
import wordwolf = require("../../../../modules/wordwolf");

export const main = async (): Promise<line.FlexMessage> => {
	return {
		type: "flex",
		altText: "ワードの難易度",
		contents: await wordwolf.depthOptionsMessage(),
	};
};
