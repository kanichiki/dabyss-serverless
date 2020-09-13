import line = require("@line/bot-sdk");
import jinro_module = require("../../../modules/jinro");

export const main = async (userNumber: number, timer: string): Promise<line.Message[]> => {
	return [
		{
			type: "flex",
			altText: "設定確認",
			contents: await jinro_module.settingConfirmMessage(userNumber, timer),
		},
	];
};
