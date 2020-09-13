import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

export const main = async (
	displayName: string,
	position: string,
	targetDisplayNames: string[],
	targetUserIndexes: number[],
	zeroGuru: boolean,
	zeroDetective: boolean
): Promise<line.Message[]> => {
	let actionMessage!: string;
	const targetMessages: line.FlexComponent[] = [
		{
			type: "spacer",
		},
	];

	if (position == crazynoisy.guru && zeroGuru) {
		actionMessage = "洗脳する人を選んでください";
		for (let i = 0; i < targetDisplayNames.length; i++) {
			const targetMessage: line.FlexButton = {
				type: "button",
				action: {
					type: "postback",
					label: targetDisplayNames[i],
					data: targetUserIndexes[i].toString(),
				},
				color: dabyss.mainColor,
			};
			targetMessages.push(targetMessage);
		}
	} else if (position == crazynoisy.detective && zeroDetective) {
		actionMessage = "調査する人を選んでください";
		for (let i = 0; i < targetDisplayNames.length; i++) {
			const targetMessage: line.FlexButton = {
				type: "button",
				action: {
					type: "postback",
					label: targetDisplayNames[i],
					data: targetUserIndexes[i].toString(),
				},
				color: dabyss.mainColor,
			};
			targetMessages.push(targetMessage);
		}
	} else {
		actionMessage = "役職を確認したら下のボタンを押してください！";
		const targetMessage: line.FlexButton = {
			type: "button",
			action: {
				type: "postback",
				label: "確認しました",
				data: "確認しました",
			},
			color: dabyss.mainColor,
		};
		targetMessages.push(targetMessage);
	}

	return [
		{
			type: "flex",
			altText: "アクション",
			contents: {
				type: "bubble",
				body: {
					type: "box",
					layout: "vertical",
					contents: [
						{
							type: "box",
							layout: "vertical",
							contents: [
								{
									type: "text",
									text: "text",
									size: "md",
									contents: [
										{
											type: "span",
											text: `${displayName}さんの役職は『`,
										},
										{
											type: "span",
											text: position,
											weight: "bold",
											color: dabyss.mainColor,
										},
										{
											type: "span",
											text: "』です",
										},
									],
									wrap: true,
								},
								{
									type: "text",
									text: actionMessage,
									size: "md",
									wrap: true,
								},
							],
						},
						{
							type: "box",
							layout: "vertical",
							contents: targetMessages,
						},
					],
				},
			},
		},
	];
};
