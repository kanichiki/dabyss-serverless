import line = require("@line/bot-sdk");

export const main = async (voterDisplayName: string): Promise<line.Message[]> => {
	return [
		{
			type: "text",
			text: `${voterDisplayName}さん、投票完了しました！`,
		},
	];
};
