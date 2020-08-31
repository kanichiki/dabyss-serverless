import line = require("@line/bot-sdk");

export const main = async (unconfirmed: string[]): Promise<line.Message[]> => {
	const message: string = unconfirmed.join("さん、");

	return [
		{
			type: "text",
			text: `${message}さんは確認が済んでいません`,
		},
	];
};
