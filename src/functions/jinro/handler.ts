import line = require("@line/bot-sdk");
import branches = require("./branches");
import jinroModule = require("../../modules/jinro");
import dabyss = require("../../modules/dabyss");

export const handler = async (lineEvent: line.MessageEvent | line.PostbackEvent) => {
    console.log(lineEvent);
    const replyToken = lineEvent.replyToken;

    const userId: string = lineEvent.source.userId;
    if (lineEvent.source.type == "group" || lineEvent.source.type == "room") {
        let groupId!: string;
        if (lineEvent.source.type == "group") {
            groupId = lineEvent.source.groupId;
        } else if (lineEvent.source.type == "room") {
            groupId = lineEvent.source.roomId; // roomIdもgroupId扱いします
        }
        const jinro = await jinroModule.Jinro.createInstance(groupId);
        const isUserParticipant = jinro.isUserExists(userId);
        if (isUserParticipant) {
            if (lineEvent.type == "message") {
                if (lineEvent.message.type == "text") {
                    // テキストメッセージイベントなら
                    const text: string = lineEvent.message.text;

                    await branches.handleGroupMessage(text, jinro, replyToken);
                }
            }
            if (lineEvent.type == "postback") {
                const postback: line.Postback = lineEvent.postback;
                if (postback.params != undefined) {
                    if (postback.params.time != undefined) {
                        const time = postback.params.time;
                        await branches.handleGroupDatetimePicker(time, jinro, replyToken);
                    }
                } else {
                    await branches.handleGroupPostback(postback.data, jinro, userId, replyToken);
                }
            }
        }
    } else {
        const user = await dabyss.User.createInstance(userId);
        const jinro = await jinroModule.Jinro.createInstance(user.groupId);
        const isUserParticipant = jinro.isUserExists(userId);
        if (isUserParticipant) {
            if (lineEvent.type == "postback") {
                const postback: line.Postback = lineEvent.postback;
                await branches.handleUserPostback(postback.data, jinro, userId, replyToken);
            }
        }
    }

    return;
};
