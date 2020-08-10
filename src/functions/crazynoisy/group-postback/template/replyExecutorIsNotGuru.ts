import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (executorDisplayName: string): Promise<line.Message[]> => {
  return [
    {
      "type": "flex",
      "altText": "役職確認",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "text",
              "wrap": true,
              "contents": [
                {
                  "type": "span",
                  "text": executorDisplayName,
                  "color": dabyss.mainColor
                },
                {
                  "type": "span",
                  "text": "さんは教祖ではなかったようですが、拷問の結果気が狂ってしまいました"
                }
              ],
              "size": "lg"
            }
          ]
        }
      }
    }
  ]
}