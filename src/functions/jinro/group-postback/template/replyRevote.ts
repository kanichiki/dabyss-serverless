import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');

export const main = async (mostVotedUserIndexes: number[], displayNames: string[]): Promise<line.Message[]> => {
	return [
		{
			type: 'text',
			text: `得票数が並んだため再投票に入ります`,
		},
		{
			type: 'flex',
			altText: '再投票',
			contents: {
				type: 'carousel',
				contents: await dabyss.voteMessage(mostVotedUserIndexes, displayNames),
			},
		},
	];
};
