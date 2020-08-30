import line = require('@line/bot-sdk');

export const main = async (displayNames: string[], positions: string[]): Promise<line.Message[]> => {
	let positionMessages = '役職一覧\n\n';

	for (let i = 0; i < displayNames.length; i++) {
		const positionMessage = `・${displayNames[i]} : ${positions[i]}\n`;
		positionMessages += positionMessage;
	}

	return [
		{
			type: 'text',
			text: positionMessages,
		},
		{
			type: 'flex',
			altText: 'ゲーム終了',
			contents: {
				type: 'bubble',
				body: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text',
							text: 'サービス向上のためフィードバックにご協力ください！',
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
								type: 'uri',
								label: 'フィードバックを書く',
								uri: 'https://forms.gle/kGHqE924ACYQmTKj7',
								altUri: {
									desktop: 'https://forms.gle/kGHqE924ACYQmTKj7',
								},
							},
							color: '#e83b10',
							style: 'primary',
						},
						{
							type: 'button',
							action: {
								type: 'message',
								label: 'ゲーム一覧',
								text: 'ゲーム一覧',
							},
							color: '#e83b10',
						},
					],
				},
			},
		},
	];
};
