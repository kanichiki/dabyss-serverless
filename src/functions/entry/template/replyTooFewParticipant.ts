import line = require("@line/bot-sdk");

export const main = async (
	userNumber: number,
	recruitingGameName: string,
	minNumber: number
): Promise<line.Message[]> => {
	return [
		{
			type: "text",
			text: `現在の参加者数は${userNumber}人です\n${recruitingGameName}を始めるには${minNumber}人以上必要です`,
			quickReply: {
				items: [
					{
						type: "action",
						action: {
							type: "message",
							label: "参加",
							text: "参加",
						},
					},
					{
						type: "action",
						action: {
							type: "message",
							label: "受付終了",
							text: "受付終了",
						},
					},
				],
			},
		},
	];
};
