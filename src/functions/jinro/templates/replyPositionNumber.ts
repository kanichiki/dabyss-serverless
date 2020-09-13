import line = require("@line/bot-sdk");
import jinro_module = require("../../../modules/jinro");

export const main = async (positionNumbers: jinro_module.PositionNumbers): Promise<line.Message[]> => {
	return [
		{
			type: "flex",
			altText: "役職人数確認",
			contents: await jinro_module.positionNumberMessage(positionNumbers),
		},
	];
};
