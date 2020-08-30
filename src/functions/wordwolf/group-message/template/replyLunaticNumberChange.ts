import line = require('@line/bot-sdk');
import wordwolf = require('../../../../modules/wordwolf');

export const main = async (lunaticNumberOptions: number[]): Promise<line.FlexMessage> => {
	return {
		type: 'flex',
		altText: '狂人の人数候補',
		contents: await wordwolf.lunaticNumberMessage(lunaticNumberOptions),
	};
};
