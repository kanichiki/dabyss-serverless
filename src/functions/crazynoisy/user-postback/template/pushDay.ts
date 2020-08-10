import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (day: number): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${day.toString()}日目の朝になりました`
        }
    ]
}