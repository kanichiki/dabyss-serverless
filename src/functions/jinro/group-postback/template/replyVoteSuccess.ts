import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (voterDisplayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${voterDisplayName}さん、投票完了しました！`
        }
    ]
}