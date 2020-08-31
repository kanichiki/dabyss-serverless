import line = require("@line/bot-sdk");
import dabyss = require("../../../../modules/dabyss");
import crazynoisy = require("../../../../modules/crazynoisy");

export const main = async (
	displayName: string,
	position: string,
	isBrainwash: boolean,
	targetDisplayNames: string[],
	targetUserIndexes: number[]
): Promise<line.Message[]> => {
	let actionMessage = "";
	const targetMessages: line.FlexComponent[] = [
		{
			type: "spacer",
		},
	];

	if (position == crazynoisy.guru || position == crazynoisy.detective) {
		if (position == crazynoisy.guru) {
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
		} else {
			if (isBrainwash) {
				actionMessage = "狂っているため調査できません";
			} else {
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
			}
		}
	} else {
		actionMessage = "アクションはありません";
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
