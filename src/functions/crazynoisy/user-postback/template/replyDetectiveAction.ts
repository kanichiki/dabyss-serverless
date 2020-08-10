import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (displayName: string, isGuru: boolean): Promise<line.Message[]> => {
    let message = "";
    if (isGuru) {
        message = "教祖でした"
    } else {
        message = "教祖ではありませんでした"
    }

    return [
        {
            type: "text",
            text: `調査の結果、${displayName}さんは${message}`
        }
    ]
}