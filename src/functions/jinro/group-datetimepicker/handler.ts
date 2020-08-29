import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');
import jinro_module = require('../../../modules/jinro');

exports.handler = async (event: any): Promise<void> => {
    const lineEvent: line.PostbackEvent = event.Input.event;
    console.log(lineEvent);

    const replyToken: string = lineEvent.replyToken;
    const postback: line.Postback = lineEvent.postback;
    let time!: string;
    if (postback.params != undefined) {
        if (postback.params.time != undefined) {
            time = postback.params.time;
        }
    }
    const source: line.EventSource = lineEvent.source;

    let groupId!: string;
    if (source.type == "group") {
        groupId = source.groupId;
    } else if (source.type == "room") {
        groupId = source.roomId; // roomIdもgroupId扱いしよう
    }

    const jinro: jinro_module.Jinro = await jinro_module.Jinro.createInstance(groupId);
    const status: string = jinro.gameStatus;

    if (status == "setting") {
        const settingNames = jinro.settingNames;
        const settingStatus = jinro.settingStatus;
        for (let i = 0; i < settingNames.length; i++) {
            if (!settingStatus[i]) {
                if (settingNames[i] == "timer") {
                    return replyTimerChosen(jinro, time, replyToken);
                }
            }
        }
    }
}

const replyTimerChosen = async (jinro: jinro_module.Jinro, time: string, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const settingIndex = await jinro.getSettingIndex("timer");

    promises.push(jinro.updateTimer(time));
    await jinro.updateSettingStateTrue(settingIndex);

    const isSettingCompleted = await jinro.isSettingCompleted();
    if (!isSettingCompleted) {
    } else {
        promises.push(replyConfirm(jinro, replyToken));
    }

    await Promise.all(promises);
    return;
};

const replyConfirm = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const userNumber = await jinro.getUserNumber();
    const timer = await jinro.getTimerString();
    const replyMessage = await import("./template/replyChanged");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, timer)));

    await Promise.all(promises);
    return;
};

