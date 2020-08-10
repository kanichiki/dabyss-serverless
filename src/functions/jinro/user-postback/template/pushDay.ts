import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (day: number): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${day.toString()}日目の朝になりました`
        }
    ]
}