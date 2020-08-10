import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (displayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${displayName}さんを洗脳します`
        }
    ]
}