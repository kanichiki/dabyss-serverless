import line = require('@line/bot-sdk');

export const main = async (day: number): Promise<line.Message[]> => {
	return [
		{
			type: 'text',
			text: `${day.toString()}日目の朝になりました`,
		},
	];
};
