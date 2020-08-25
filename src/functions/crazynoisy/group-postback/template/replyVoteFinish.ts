import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (day: number): Promise<line.Message[]> => {
  const channelId: string = await dabyss.getChannelId();
  return [
    {
      "type": "flex",
      "altText": "設定確認",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": `${day.toString()}日目の夜になりました`
            },
            {
              "type": "text",
              "text": "各自アクションをしてください"
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "アクションする",
                "uri": `https://line.me/R/oaMessage/${channelId}/`,
                "altUri": {
                  "desktop": `https://line.me/R/oaMessage/${channelId}/`
                }
              },
              "color": dabyss.mainColor
            }
          ]
        }
      }

    }
  ]
}