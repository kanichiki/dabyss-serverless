import line = require("@line/bot-sdk");

export const main = async (displayName: string): Promise<line.Message[]> => {
	return [
		{
			type: "text",
			text: `${displayName}さんは既に参加しています`,
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
