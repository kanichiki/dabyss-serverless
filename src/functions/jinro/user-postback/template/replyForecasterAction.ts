import line = require("@line/bot-sdk");

export const main = async (displayName: string, isWerewolf: boolean): Promise<line.Message[]> => {
	let message = "";
	if (isWerewolf) {
		message = "人狼でした";
	} else {
		message = "人狼ではありませんでした";
	}

	return [
		{
			type: "text",
			text: `占いの結果、${displayName}さんは${message}`,
		},
	];
};
