import line = require('@line/bot-sdk');
import wordwolf = require('../../../../modules/wordwolf');

export const main = async (text: string, wolfNumberOptions: number[]): Promise<line.Message[]> => {

  return [
    {
      type: "text",
      text: `難易度${text}が選ばれました！`
    },
    {
      "type": "flex",
      "altText": "ウルフの人数候補",
      "contents": await wordwolf.wolfNumberMessage(wolfNumberOptions)
    }
  ]
}

