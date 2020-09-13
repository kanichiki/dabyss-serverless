import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");

export const main = async (
	voterDisplayName: string,
	executorDisplayName: string,
	isExecutorWolf: boolean,
	displayNames: string[],
	isWinnerArray: boolean[]
): Promise<line.Message[]> => {
	let message = "";
	if (!isExecutorWolf) {
		message = "ウルフ側の勝利です！！";
	} else {
		message = "市民側の勝利です！！";
	}

	const winners = [];
	for (let i = 0; i < displayNames.length; i++) {
		if (isWinnerArray[i]) {
			winners.push(displayNames[i]);
		}
	}
	const winnerMessage = winners.join("さん、");

	return [
		{
			type: "text",
			text: `${voterDisplayName}さん、投票完了しました！`,
		},
		{
			type: "text",
			text: `得票数が並んだため、ランダムで${executorDisplayName}さんが処刑されました`,
		},
		{
			type: "flex",
			altText: "勝者",
			contents: {
				type: "bubble",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: message,
							size: "lg",
							wrap: true,
							align: "center",
						},
						{
							type: "separator",
							margin: "md",
						},
						{
							type: "text",
							text: `勝者 : ${winnerMessage}さん`,
							margin: "md",
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
								type: "message",
								label: "ワードを見る",
								text: "ワードを見る",
							},
							color: dabyss.mainColor,
						},
					],
				},
			},
		},
	];
};
