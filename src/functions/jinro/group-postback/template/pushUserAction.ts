import line = require('@line/bot-sdk');
import dabyss = require('../../../../modules/dabyss');
import jinro_module = require('../../../../modules/jinro');

export const main = async (displayName: string, position: string, isAlive: boolean, targetAliveDisplayNames: string[], targetDeadDisplayNames: string[],targetUserIndexes: number[], targetDeadUserIndexes: number[]): Promise<line.Message[]> => {
    let actionMessage = "";
    let targetMessages: line.FlexComponent[] = [
        {
            "type": "spacer"
        }
    ]

    if (position == jinro_module.werewolf) {
        if (!isAlive) {
            actionMessage = "死んでいるため行動できません";
        } else {
            actionMessage = "噛む人を選んでください";
            for (let i = 0; i < targetAliveDisplayNames.length; i++) {
                const targetMessage: line.FlexButton = {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": targetAliveDisplayNames[i],
                        "data": targetUserIndexes[i].toString()
                    },
                    "color": dabyss.mainColor
                }
                targetMessages.push(targetMessage);
            }    
        }
    } else if(position == jinro_module.forecaster) {
        if (!isAlive) {
            actionMessage = "死んでいるため行動できません";
        } else {
            actionMessage = "占う人を選んでください";
            for (let i = 0; i < targetAliveDisplayNames.length; i++) {
                const targetMessage: line.FlexButton = {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": targetAliveDisplayNames[i],
                        "data": targetUserIndexes[i].toString()
                    },
                    "color": dabyss.mainColor
                }
                targetMessages.push(targetMessage);
            }
        }
    } else if(position == jinro_module.psychic) {
        if (!isAlive) {
            actionMessage = "死んでいるため行動できません";
        } else {
            if (!targetDeadDisplayNames) {
                actionMessage = "死んでいる人がいないため、霊媒できません"
            } else {
                actionMessage = "霊媒先を選んでください";
                for (let i = 0; i < targetDeadDisplayNames.length; i++) {
                    const targetMessage: line.FlexButton = {
                        "type": "button",
                        "action": {
                            "type": "postback",
                            "label": targetDeadDisplayNames[i],
                            "data": targetDeadUserIndexes[i].toString()
                        },
                        "color": dabyss.mainColor
                    }
                    targetMessages.push(targetMessage);
                }
            }
        }
    } else if(position == jinro_module.hunter) {
        if (!isAlive) {
            actionMessage = "死んでいるため行動できません";
        } else {
            if (!targetAliveDisplayNames) {
                actionMessage = "だれも守るひとがいません"
            } else {
                actionMessage = "守るひとを選んでください";
                for (let i = 0; i < targetAliveDisplayNames.length; i++) {
                    const targetMessage: line.FlexButton = {
                        "type": "button",
                        "action": {
                            "type": "postback",
                            "label": targetAliveDisplayNames[i],
                            "data": targetUserIndexes[i].toString()
                        },
                        "color": dabyss.mainColor
                    }
                    targetMessages.push(targetMessage);
                }
            }
        }
    } else {
        actionMessage = "アクションはありません";
    }





    return [
        {
            "type": "flex",
            "altText": "アクション",
            "contents": {
                "type": "bubble",
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "text",
                                    "text": "text",
                                    "size": "md",
                                    "contents": [
                                        {
                                            "type": "span",
                                            "text": `${displayName}さんの役職は『`
                                        },
                                        {
                                            "type": "span",
                                            "text": position,
                                            "weight": "bold",
                                            "color": dabyss.mainColor
                                        },
                                        {
                                            "type": "span",
                                            "text": "』です"
                                        }
                                    ],
                                    "wrap": true
                                },
                                {
                                    "type": "text",
                                    "text": actionMessage,
                                    "size": "md",
                                    "wrap": true
                                }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": targetMessages
                        }
                    ]
                }
            }
        }
    ]
}