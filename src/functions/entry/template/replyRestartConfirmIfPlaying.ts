import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');

export const main = async (playingGameName: string, newGameName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${playingGameName}が進行中です。\n新しくゲームを始める場合はもう一度続けてゲーム名を発言してください。`
        }
    ]
}