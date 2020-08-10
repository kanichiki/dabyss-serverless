import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import wordwolf = require('../../../../modules/wordwolf');

export const main = async (displayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${displayName}さんは投票済みです`
        }
    ]
}