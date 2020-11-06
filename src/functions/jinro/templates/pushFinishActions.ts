import line = require("@line/bot-sdk");
import dabyss = require("../../../modules/dabyss");

export const main = async (day: number, timer: string): Promise<line.Message[]> => {
    return [
        {
            type: "flex",
            altText: "残り時間",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: `${day.toString()}日目の話し合いをスタートします`,
                            wrap: true,
                            weight: "bold",
                        },
                        {
                            type: "text",
                            text: `話し合い時間は${timer}です`,
                            wrap: true,
                            weight: "bold",
                        },
                        {
                            type: "text",
                            text: "話し合いを途中で終了するには「終了」と発言してください",
                            wrap: true,
                        },
                        {
                            type: "text",
                            text: "話し合いの残り時間は下のボタンで確認できます！",
                            wrap: true,
                        },
                    ],
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            action: {
                                type: "postback",
                                data: "残り時間",
                                label: "残り時間",
                            },
                            color: dabyss.mainColor,
                            style: "primary",
                        },
                        {
                            type: "button",
                            action: {
                                type: "message",
                                label: "役職人数確認",
                                text: "役職人数確認",
                            },
                            color: dabyss.subColor,
                        },
                    ],
                },
            },
        },
    ];
};
