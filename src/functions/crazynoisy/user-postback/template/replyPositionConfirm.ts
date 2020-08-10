import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `確認ありがとうございます！`
        }
    ]
}