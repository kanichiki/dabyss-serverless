import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (displayName: string, isWerewolf: boolean): Promise<line.Message[]> => {
    let message = "";
    if (isWerewolf) {
        message = "人狼でした"
    } else {
        message = "人狼ではありませんでした"
    }

    return [
        {
            type: "text",
            text: `占いの結果、${displayName}さんは${message}`
        }
    ]
}