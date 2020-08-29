import line = require('@line/bot-sdk');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (userNumber: number, numberOption: number): Promise<line.Message[]> => {

    return [
        {
            "type": "flex",
            "altText": "役職人数確認",
            "contents": await crazynoisy.positionNumberMessage(userNumber, numberOption)
        }
    ]
}