import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (displayNames: string[]): Promise<line.Message[]> => {

  const displayNamesSan: string = displayNames.join("さん、\n");

  return [
    {
      type: "text",
      text: `参加受付を終了します\n\n参加者は\n\n${displayNamesSan}さん\n\nです！\nゲームを途中で終了する際は「強制終了」と発言してください`
    }
  ]

}