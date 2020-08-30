import line = require('@line/bot-sdk');

export const main = async (executorDisplayName: string): Promise<line.Message[]> => {
	return [
		{
			type: 'text',
			text: `${executorDisplayName}さんが拷問にかけられました`,
		},
	];
};
