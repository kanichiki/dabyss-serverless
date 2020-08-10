import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (executorDisplayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `得票数が並んだため、ランダムで${executorDisplayName}さんが処刑されました`
        }
    ]
}