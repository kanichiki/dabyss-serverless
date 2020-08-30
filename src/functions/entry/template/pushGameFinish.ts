import line = require('@line/bot-sdk');

export const main = async (): Promise<line.Message[]> => {
	return [
		{
			type: 'text',
			text: `ゲームを終了します`,
		},
	];
};
