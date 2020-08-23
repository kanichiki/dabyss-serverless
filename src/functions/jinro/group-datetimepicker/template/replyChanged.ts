import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (userNumber: number, type: number, timer: string): Promise<line.Message[]> => {
  return [
    {
      "type": "flex",
      "altText": "設定確認",
      "contents": await jinro_module.settingConfirmMessage(userNumber, timer)
    }
  ]
}