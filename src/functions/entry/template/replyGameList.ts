import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');

export const main = async (): Promise<line.Message[]> => {
    return [
        {
            "type": "flex",
            "altText": "ゲーム一覧",
            "contents": await dabyss.gamesMessage()
        }
    ]
}