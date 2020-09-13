import line = require("@line/bot-sdk");

export const mainColor = "#E83b10";
export const subColor = "#036568";

export const voteMessage = async (userIndexes: number[], displayNames: string[]): Promise<line.FlexBubble[]> => {
	const voteMessages: line.FlexBubble[] = [];

	for (const userIndex of userIndexes) {
		const voteMessage: line.FlexBubble = {
			type: "bubble",
			size: "micro",
			body: {
				type: "box",
				layout: "vertical",
				contents: [
					{
						type: "button",
						action: {
							type: "postback",
							label: displayNames[userIndex],
							data: userIndex.toString(),
						},
						color: mainColor,
					},
				],
			},
		};

		voteMessages.push(voteMessage);
	}
	return voteMessages;
};

export const revoteMessage = async (
	displayNames: string[],
	userIds: string[],
	userIndexes: number[]
): Promise<line.FlexBubble[]> => {
	const voteMessages: line.FlexBubble[] = [];

	// どうやら整数は送れないらしい
	for (const userIndex of userIndexes) {
		const voteMessage: line.FlexBubble = {
			type: "bubble",
			size: "micro",
			body: {
				type: "box",
				layout: "vertical",
				contents: [
					{
						type: "button",
						action: {
							type: "postback",
							label: displayNames[userIndex],
							data: userIds[userIndex],
						},
						color: mainColor,
					},
				],
			},
		};

		voteMessages.push(voteMessage);
	}
	return voteMessages;
};

export const gamesMessage = async (): Promise<line.FlexCarousel> => {
	return {
		type: "carousel",
		contents: [
			{
				type: "bubble",
				size: "mega",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "ワードウルフ",
							size: "xl",
							style: "normal",
							color: mainColor,
							align: "center",
							offsetTop: "10px",
						},
					],
					spacing: "none",
					margin: "none",
				},
				footer: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "少数派を見つけ出す",
							align: "center",
							size: "lg",
						},
						{
							type: "text",
							text: "トークゲーム！",
							align: "center",
							size: "lg",
						},
						{
							type: "button",
							action: {
								type: "uri",
								label: "詳しい説明はこちら",
								uri: "https://note.com/m_dabyss/n/nb741cd926bf9",
								altUri: {
									desktop: "https://note.com/m_dabyss/n/nb741cd926bf9",
								},
							},
							color: subColor,
						},
						{
							type: "button",
							action: {
								type: "message",
								label: "ワードウルフを始める",
								text: "ワードウルフ",
							},
							style: "primary",
							margin: "md",
							color: mainColor,
						},
					],
					spacing: "none",
					margin: "none",
				},
			},
			{
				type: "bubble",
				size: "mega",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "クレイジーノイジー",
							size: "xl",
							style: "normal",
							color: mainColor,
							align: "center",
							offsetTop: "10px",
						},
					],
					spacing: "none",
					margin: "none",
				},
				footer: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "text",
							text: "みんな狂っていく",
							align: "center",
							size: "lg",
						},
						{
							type: "text",
							text: "新感覚オリジナルゲーム！",
							align: "center",
							size: "lg",
						},
						{
							type: "button",
							action: {
								type: "uri",
								label: "詳しい説明はこちら",
								altUri: {
									desktop: "https://note.com/m_dabyss/n/n0c37924b4f2e",
								},
								uri: "https://note.com/m_dabyss/n/n0c37924b4f2e",
							},
							color: subColor,
						},
						{
							type: "button",
							action: {
								type: "message",
								label: "クレイジーノイジーを始める",
								text: "クレイジーノイジー",
							},
							style: "primary",
							margin: "md",
							color: mainColor,
						},
					],
					spacing: "none",
					margin: "none",
				},
			},
		],
	};
};
