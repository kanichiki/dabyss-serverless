import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");

export const main = async (userIndexes: number[], displayNames: string[]): Promise<line.Message[]> => {
	return [
		{
			type: "text",
			text: `話し合い時間が終了しました`,
		},
		{
			type: "flex",
			altText: "投票",
			contents: {
				type: "bubble",
				size: "giga",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "みなさん投票してください",
							wrap: true,
							align: "center",
						},
					],
				},
			},
		},
		{
			type: "flex",
			altText: "投票",
			contents: {
				type: "carousel",
				contents: await dabyss.voteMessage(userIndexes, displayNames),
			},
		},
	];
};
