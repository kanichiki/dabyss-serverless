import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');

export const main = async (recruitingGameName: string, newGameName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${recruitingGameName}の参加者を募集中です。\n新しくゲームを始める場合はもう一度続けてゲーム名を発言してください。`
        }
    ]
}