import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `確認ありがとうございます！`
        }
    ]
}