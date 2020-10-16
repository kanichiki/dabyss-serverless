import line = require("@line/bot-sdk");
import { Player } from "../../../modules/jinro/classes/Player"


export const main = async (players: Player[]): Promise<line.Message[]> => {
	let positionMessages = "役職一覧\n\n";

	for (let i = 0; i < players.length; i++) {
		const positionMessage = `・${players[i].displayName} : ${players[i].position}\n`;
		positionMessages += positionMessage;
	}

	return [
		{
			type: "text",
			text: positionMessages,
		},
		{
			type: "flex",
			altText: "ゲーム終了",
			contents: {
				type: "bubble",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "サービス向上のためフィードバックにご協力ください！",
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
								label: "フィードバックを書く",
								uri: "https://forms.gle/kGHqE924ACYQmTKj7",
								altUri: {
									desktop: "https://forms.gle/kGHqE924ACYQmTKj7",
								},
							},
							color: "#e83b10",
							style: "primary",
						},
						{
							type: "button",
							action: {
								type: "message",
								label: "ゲーム一覧",
								text: "ゲーム一覧",
							},
							color: "#e83b10",
						},
					],
				},
			},
		},
	];
};
