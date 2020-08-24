import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');
import jinro_module = require('../../../modules/jinro');

process.on('uncaughtException', function (err) {
    console.log(err);
});

exports.handler = async (event: any, context: any): Promise<void> => {
    const lineEvent: line.MessageEvent = event.Input.event;
    console.log(lineEvent);

    const replyToken: string = lineEvent.replyToken;
    let message!: line.TextEventMessage;
    if (lineEvent.message.type == "text") {
        message = lineEvent.message;
    }
    const text: string = message.text;
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
        if (settingStatus == [] || settingStatus == undefined) {
            const group: dabyss.Group = await dabyss.Group.createInstance(groupId);
            if (group.status == "recruit") {
                return replyRollCallEnd(group, jinro, replyToken);
            }
        } else {
            const isSettingCompleted = await jinro.isSettingCompleted();
            if (!isSettingCompleted) {
                for (let i = 0; i < settingNames.length; i++) {
                    if (!settingStatus[i]) {
                        /* if (settingNames[i] == "type") {
                            if ((text == "1" || text == "2") || text == "3") {
                                await replyTypeChosen(jinro, text, replyToken);
                            }
                        } */
                        break; // これがないと設定繰り返しちゃう
                    }
                }
            } else { // 設定項目がすべてtrueだったら
                let changeSetting: string = "";
                switch (text) {
                    case "ゲームを開始する":
                        await replyConfirmYes(jinro, replyToken);
                        break;
                    case "話し合い方法変更":
                        changeSetting = "type";
                        break;
                    case "議論時間変更":
                        changeSetting = "timer";
                        break;
                }
                if (changeSetting != "") {
                    await replySettingChange(jinro, changeSetting, replyToken);
                }
            }
        }
    } else if (text == "役職人数確認") {
        // TODO ここ実装
        await replyPositionNumber(jinro, replyToken);
    }

    if (status == "discuss") {
        // 話し合い中だった場合

        if (text == "終了") {
            await replyDiscussFinish(jinro, replyToken);
        }

    }

    if (status == "winner") {
        // すべての結果発表がまだなら
        if (text == "役職を見る") {
            await replyAnnounceResult(jinro, replyToken);
        }
    }
}

const replyRollCallEnd = async (group: dabyss.Group, jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const displayNames: string[] = await jinro.getDisplayNames(); // 参加者の表示名リスト

    // DB変更操作１
    promises.push(jinro.updateDefaultSettingStatus());
    promises.push(group.updateStatus("play")); // 参加者リストをプレイ中にして、募集中を解除する

    const userNumber = await jinro.getUserNumber();
    const timer = await jinro.getTimerString();
    const replyMessage = await import("./template/replyRollCallEnd");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayNames, userNumber, timer)));

    await Promise.all(promises);
    return;
};


const replyTypeChosen = async (jinro: jinro_module.Jinro, text: string, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateTalkType(Number(text)));
    await jinro.updateSettingState("type", true);

    const isSettingCompleted: boolean = await jinro.isSettingCompleted();
    if (!isSettingCompleted) {

    } else {
        promises.push(replyConfirm(jinro, replyToken));
    }

    await Promise.all(promises);
    return;
};

const replySettingChange = async (jinro: jinro_module.Jinro, setting: string, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    // if (setting == "type") {
    //     promises.push(jinro.updateSettingState(setting, false)); // 設定状態をfalseに
    //     const replyMessage = await import("./template/replyTypeChange");
    //     promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
    // }
    if (setting == "timer") {
        promises.push(jinro.updateSettingState(setting, false)); // 設定状態をfalseに
        const replyMessage = await import("./template/replyTimerChange");
        promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
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
}

const replyConfirmYes = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateGameStatus("action"));

    await jinro.updatePositions();

    promises.push(jinro.updateDefaultAliveStatus()); // 生死ステータスを初期配置
    promises.push(jinro.putZeroAction()); // 役職確認ステータスを全員false

    const userIds = jinro.userIds;
    const displayNames = await jinro.getDisplayNames();
    const positions = jinro.positions;
    const userNumber = await jinro.getUserNumber();

    for (let i = 0; i < userNumber; i++) {
        const targetDisplayNames = await jinro.getDisplayNamesExceptOneself(i);
        const targetUserIndexes = await jinro.getUserIndexesExceptOneself(i);

        const pushPosition = await import("./template/pushUserPosition");
        promises.push(dabyss.pushMessage(userIds[i], await pushPosition.main(displayNames[i], positions[i], targetDisplayNames, targetUserIndexes)));
    }

    const replyMessage = await import("./template/replyConfirmYes");
    // promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, werewolfNumber, forecasterNumber, psychicNumber, hunterNumber, madmanNumber)));
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(jinro.positionNumbers)));


    await Promise.all(promises);
    return;
};

const replyPositionNumber = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const userNumber = await jinro.getUserNumber();
    const replyMessage = await import("./template/replyPositionNumber");
    await dabyss.replyMessage(replyToken, await replyMessage.main(jinro.positionNumbers));
    return;
}


const replyDiscussFinish = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    // DB変更操作１，２
    // 投票データを挿入出来たら話し合い終了ステータスをtrueにする同期処理
    promises.push(jinro.putFirstVote());
    promises.push(jinro.updateGameStatus("vote"));

    const userNumber: number = await jinro.getUserNumber();
    const shuffleUserIndexes: number[] = await dabyss.makeShuffuleNumberArray(userNumber);

    let displayNames: string[] = [];

    // 公平にするため投票用の順番はランダムにする
    for (let i = 0; i < userNumber; i++) {
        displayNames[i] = await jinro.getDisplayName(shuffleUserIndexes[i]);
    }

    //if (usePostback) { // postbackを使う設定の場合
    const replyMessage = await import("./template/replyDiscussFinish");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(shuffleUserIndexes, displayNames)));

    await Promise.all(promises);
    return;
};

const replyAnnounceResult = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateGameStatus("result"));
    const group: dabyss.Group = await dabyss.Group.createInstance(jinro.groupId);
    promises.push(group.finishGroup());

    const userNumber = await jinro.getUserNumber();
    const displayNames = await jinro.getDisplayNames();
    const positions = jinro.positions;

    const replyMessage = await import("./template/replyAnnounceResult");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayNames, positions)));

    await Promise.all(promises);
    return;
};