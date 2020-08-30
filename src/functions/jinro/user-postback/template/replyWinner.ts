import line = require('@line/bot-sdk');

export const main = async (
	displayNames: string[],
	isWinnerWerewolf: boolean,
	winnerIndexes: number[]
): Promise<line.Message[]> => {
	const winners = [];
	for (const winnerIndex of winnerIndexes) {
		winners.push(displayNames[winnerIndex]);
	}
	const winnerMessage = winners.join('さん、');

	let message1 = '';
	let message2 = '';
	if (isWinnerWerewolf) {
		message1 = '人狼の数が市民の数と並びました';
		message2 = '人狼陣営の勝利です！！';
	} else {
		message1 = 'すべての人狼を処刑しました';
		message2 = '市民陣営の勝利です！！';
	}

	return [
		{
			type: 'flex',
			altText: '勝者',
			contents: {
				type: 'bubble',
				body: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text',
							text: message1,
							size: 'md',
							wrap: true,
							align: 'center',
						},
						{
							type: 'text',
							text: message2,
							size: 'lg',
							wrap: true,
							align: 'center',
						},
						{
							type: 'separator',
							margin: 'md',
						},
						{
							type: 'text',
							text: `勝者 : ${winnerMessage}さん`,
							margin: 'md',
							wrap: true,
						},
					],
				},
				footer: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'button',
							action: {
								type: 'message',
								label: '役職を見る',
								text: '役職を見る',
							},
							color: '#E83b10',
						},
					],
				},
			},
		},
	];
};
