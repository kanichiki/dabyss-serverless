import dabyss = require("../../modules/dabyss");
import line = require("@line/bot-sdk");

export const handler = async (lineEvent: line.MessageEvent | line.PostbackEvent) => {
	console.log(lineEvent);

	return;
};
