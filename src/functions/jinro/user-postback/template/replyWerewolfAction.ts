import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (displayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${displayName}さんを噛み殺します`
        }
    ]
}