import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import crazynoisy = require('../../../../modules/crazynoisy');

export const main = async (): Promise<line.FlexMessage> => {

  return {
    "type": "flex",
    "altText": "議論時間変更",
    "contents": await crazynoisy.timerMessage()
  }

}