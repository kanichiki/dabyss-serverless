import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');
import crazynoisy = require('../../../modules/crazynoisy');

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


    const crazyNoisy: crazynoisy.CrazyNoisy = await crazynoisy.CrazyNoisy.createInstance(groupId);
    const status: string = crazyNoisy.gameStatus;

    if (status == "setting") {
        const settingNames = crazyNoisy.settingNames;
        const settingStatus = crazyNoisy.settingStatus;
        for (let i = 0; i < settingNames.length; i++) {
            if (!settingStatus[i]) {
                if (settingNames[i] == "timer") {
                    return replyTimerChosen(crazyNoisy, time, replyToken);
                }
            }
        }
    }
}

const replyTimerChosen = async (crazyNoisy: crazynoisy.CrazyNoisy, time: string, replyToken: string): Promise<void> => {
    let promises: Promise<void>[];
    promises = [];

    const settingIndex = await crazyNoisy.getSettingIndex("timer");

    promises.push(crazyNoisy.updateTimer(time));
    await crazyNoisy.updateSettingStateTrue(settingIndex);

    const isSettingCompleted = await crazyNoisy.isSettingCompleted();
    if (!isSettingCompleted) {
    } else {
        promises.push(replyConfirm(crazyNoisy, replyToken));
    }

    await Promise.all(promises);
    return;
};

const replyConfirm = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const userNumber = await crazyNoisy.getUserNumber();
    const mode = crazyNoisy.gameMode;
    const type = crazyNoisy.talkType;
    const timer = await crazyNoisy.getTimerString();
    const zeroGuru = crazyNoisy.zeroGuru;
    const zeroDetective = crazyNoisy.zeroDetective;

    const replyMessage = await import("./template/replyChanged");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, mode, type, timer, zeroGuru, zeroDetective)));

    await Promise.all(promises);
    return;
};

