import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import wordwolf = require('../../../../modules/wordwolf');

export const main = async (wolfNumber: number, lunaticNumberOptions: number[]): Promise<line.Message[]> => {

  return [
    {
      type: "text",
      text: `ウルフは${wolfNumber}人ですね！`
    },
    {
      "type": "flex",
      "altText": "狂人の人数候補",
      "contents": await wordwolf.lunaticNumberMessage(lunaticNumberOptions)
    }
  ]
}