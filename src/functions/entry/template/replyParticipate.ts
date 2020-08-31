import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");

export const main = async (
	recruitingGameName: string,
	displayName: string,
	displayNames: string[]
): Promise<line.Message[]> => {
	const displayNamesSan: string = displayNames.join("さん、\n");

	return [
		{
			type: "text",
			text: `${displayName}さんの参加を確認しました！\n\n現在の参加者は\n\n${displayNamesSan}さん\n\nです！\n引き続き${recruitingGameName}の参加者を募集します！`,
		},
		{
			type: "flex",
			altText: "参加募集",
			contents: {
				type: "bubble",
				footer: {
					type: "box",
					layout: "horizontal",
					spacing: "sm",
					contents: [
						{
							type: "button",
							height: "sm",
							action: {
								type: "message",
								label: "参加",
								text: "参加",
							},
							color: dabyss.mainColor,
							style: "primary",
						},
						{
							type: "separator",
						},
						{
							type: "button",
							height: "sm",
							action: {
								type: "message",
								label: "受付終了",
								text: "受付終了",
							},
							color: dabyss.mainColor,
							style: "primary",
						},
						{
							type: "spacer",
							size: "sm",
						},
					],
					flex: 0,
				},
			},
		},
	];
};
