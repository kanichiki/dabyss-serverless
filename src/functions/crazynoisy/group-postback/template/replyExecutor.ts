import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (executorDisplayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${executorDisplayName}さんが拷問にかけられました`
        }
    ]
}