import line = require('@line/bot-sdk');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (): Promise<line.Message[]> => {

  return [
    {
      "type": "flex",
      "altText": "モード",
      "contents": crazynoisy.modeOptions
    }

  ]

}