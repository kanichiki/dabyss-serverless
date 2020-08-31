import line = require("@line/bot-sdk");

export const main = async (playingGameName: string): Promise<line.Message[]> => {
	return [
		{
			type: "text",
			text: `${playingGameName}が進行中です。\n新しくゲームを始める場合はもう一度続けてゲーム名を発言してください。`,
		},
	];
};
