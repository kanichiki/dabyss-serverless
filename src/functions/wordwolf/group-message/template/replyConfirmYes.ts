import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');

export const main = async (timer: string): Promise<line.FlexMessage[]> => {
  const channelId: string = await dabyss.getChannelId();
  return [
    {
      "type": "flex",
      "altText": "ゲームスタート",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "ゲームをスタートします",
              "wrap": true
            },
            {
              "type": "text",
              "text": "それぞれのワードを個人トークルームにて確認してください",
              "wrap": true
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
                "label": "ワードを確認する",
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
    },
    {
      "type": "flex",
      "altText": "残り時間",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": `話し合い時間は${timer}です`,
              "wrap": true,
              "weight": "bold"
            },
            {
              "type": "text",
              "text": "話し合いを途中で終了するには「終了」と発言してください",
              "wrap": true
            },
            {
              "type": "text",
              "text": "話し合いの残り時間は下のボタンで確認できます！",
              "wrap": true
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
                "type": "postback",
                "data": "残り時間",
                "label": "残り時間"
              },
              "color": dabyss.mainColor,
              "style": "primary"
            }
          ]
        }
      }
    }
  ]
}