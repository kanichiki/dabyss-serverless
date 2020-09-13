import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

export const main = async (userNumber: number, numberOption: number): Promise<line.Message[]> => {
	const channelId: string = await dabyss.getChannelId();
	return [
		{
			type: "flex",
			altText: "役職人数確認",
			contents: await crazynoisy.positionNumberMessage(userNumber, numberOption),
		},
		{
			type: "flex",
			altText: "役職確認",
			contents: {
				type: "bubble",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "それぞれの役職を個人トークルームにて確認してください",
							wrap: true,
						},
						{
							type: "text",
							text: "役職を確認した方は個人トークルームにて「確認しました」ボタンを押してください",
							wrap: true,
						},
					],
				},
				footer: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "button",
							action: {
								type: "uri",
								label: "役職を確認する",
								uri: `https://line.me/R/oaMessage/${channelId}/`,
								altUri: {
									desktop: `https://line.me/R/oaMessage/${channelId}/`,
								},
							},
							color: dabyss.mainColor,
						},
						{
							type: "button",
							action: {
								type: "postback",
								label: "確認状況",
								data: "確認状況",
							},
							color: dabyss.subColor,
							margin: "sm",
						}, //,
						// {
						//   "type": "separator",
						//   "margin": "sm"
						// },
						// {
						//   "type": "button",
						//   "action": {
						//     "type": "postback",
						//     "label": "確認しました",
						//     "data": "確認しました"
						//   },
						//   "color": parts.mainColor,
						//   "style": "primary",
						//   "margin": "sm"
						// }
					],
				},
			},
		},
	];
};
