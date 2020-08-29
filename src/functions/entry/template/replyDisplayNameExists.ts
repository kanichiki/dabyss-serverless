import line = require('@line/bot-sdk');

export const main = async (): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `同じ名前の参加者が存在します。\nお手数ですが、表示名を変更して再度参加お願いします。`
        }
    ]
}