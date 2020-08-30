import line = require('@line/bot-sdk');
import wordwolf = require('../../../../modules/wordwolf');

/* ジャンル
exports.main = async (displayNames, genres) => {

    let genreMessages = [];
    for (let id in genres) {
        const genreMessage = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "message",
                            "label": genres[id],
                            "text": genres[id]
                        },
                        "color": parts.mainColor,
                        "style": "link"
                    }
                ]
            }
        }
        genreMessages.push(genreMessage);
    }

    const displayNamesSan = displayNames.join("さん、\n");

    return [
        {
            type: "text",
            text: `参加受付を終了します`
        },
        {
            type: "text",
            text: `参加者は\n\n${displayNamesSan}さん\n\nです！`
        },
        {
            type: "text",
            text: `ワードのジャンルを選んでください`
        },
        {
            "type": "flex",
            "altText": "ワードのジャンル候補",
            "contents": {
                "type": "carousel",
                "contents": genreMessages
            }
        }
    ]

}
*/

// depth
export const main = async (displayNames: string[]): Promise<line.Message[]> => {
	// let depthMessages = [];
	// for (let depth in depths) {
	//     const depthMessage = {
	//         "type": "bubble",
	//         "body": {
	//             "type": "box",
	//             "layout": "vertical",
	//             "contents": [
	//                 {
	//                     "type": "button",
	//                     "action": {
	//                         "type": "message",
	//                         "label": depth,
	//                         "text": depth
	//                     },
	//                     "color": parts.mainColor,
	//                     "style": "link"
	//                 }
	//             ]
	//         }
	//     }
	//     depthMessages.push(depthMessage);
	// }

	const displayNamesSan: string = displayNames.join('さん、\n');

	return [
		{
			type: 'text',
			text: `参加受付を終了します\n\n参加者は\n\n${displayNamesSan}さん\n\nです！`,
		},
		{
			type: 'text',
			text: `ゲームを途中で終了する際は「強制終了」と発言してください`,
		},
		{
			type: 'flex',
			altText: 'ワードの難易度',
			contents: await wordwolf.depthOptionsMessage(),
		},
	];
};
