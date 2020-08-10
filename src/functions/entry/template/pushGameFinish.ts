import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');

export const main = async (): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `ゲームを終了します`
        }
    ]
}