import dabyss = require("../../../modules/dabyss");
import jinroModule = require("../../../modules/jinro");

export const handleGroupMessage = async (text: string, jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const status: string = jinro.gameStatus;

    if (status == "setting") {
        const settingNames = jinro.settingNames;
        const settingStatus = jinro.settingStatus;
        if (settingStatus == [] || settingStatus == undefined) {
            const group: dabyss.Group = await dabyss.Group.createInstance(jinro.groupId);
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
            } else {
                // 設定項目がすべてtrueだったら
                let changeSetting = "";
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
};

const replyRollCallEnd = async (group: dabyss.Group, jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const displayNames: string[] = await jinro.getDisplayNames(); // 参加者の表示名リスト

    // DB変更操作１
    promises.push(jinro.updateDefaultSettingStatus());
    promises.push(group.updateStatus("play")); // 参加者リストをプレイ中にして、募集中を解除する

    const userNumber = await jinro.getUserNumber();
    const timer = await jinro.getTimerString();
    const replyMessage = await import("../templates/replyRollCallEnd");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayNames, userNumber, timer)));

    await Promise.all(promises);
    return;
};

const replySettingChange = async (jinro: jinroModule.Jinro, setting: string, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    // if (setting == "type") {
    //     promises.push(jinro.updateSettingState(setting, false)); // 設定状態をfalseに
    //     const replyMessage = await import("./template/replyTypeChange");
    //     promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
    // }
    if (setting == "timer") {
        promises.push(jinro.updateSettingState(setting, false)); // 設定状態をfalseに
        const replyMessage = await import("../templates/replyTimerChange");
        promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
    }

    await Promise.all(promises);
    return;
};

const replyConfirmYes = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateGameStatus("action"));

    await jinro.updatePositions();

    promises.push(jinro.updateDefaultAliveStatus()); // 生死ステータスを初期配置
    promises.push(jinro.updateDefaultReadyStatus()); // 役職確認ステータスを全員false

    const players = jinro.players;
    const userNumber = await jinro.getUserNumber();

    for (let i = 0; i < userNumber; i++) {
        const player = players[i];
        const targetDisplayNames = await jinro.getDisplayNamesExceptOneself(i);
        const targetUserIndexes = await jinro.getUserIndexesExceptOneself(i);

        const pushPosition = await import("../templates/pushUserPosition");
        promises.push(
            dabyss.pushMessage(
                player.userId,
                await pushPosition.main(player.displayName, player.position, targetDisplayNames, targetUserIndexes)
            )
        );
    }

    const replyMessage = await import("../templates/replyConfirmYes");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(jinro.positionNumbers)));

    await Promise.all(promises);
    return;
};

const replyPositionNumber = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const replyMessage = await import("../templates/replyPositionNumber");
    await dabyss.replyMessage(replyToken, await replyMessage.main(jinro.positionNumbers));
    return;
};

const replyDiscussFinish = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.discussion.updateIsDiscussingFalse());
    // promises.push(jinro.putFirstVote());
    promises.push(jinro.updateGameStatus("vote"));

    const userNumber: number = await jinro.getUserNumber();
    const shuffleUserIndexes: number[] = await dabyss.makeShuffleNumberArray(userNumber);
    const displayNames = await jinro.getDisplayNames();
    const replyMessage = await import("../templates/replyDiscussFinish");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(shuffleUserIndexes, displayNames)));

    await Promise.all(promises);
    return;
};

const replyAnnounceResult = async (jinro: jinroModule.Jinro, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateGameStatus("result"));
    const group: dabyss.Group = await dabyss.Group.createInstance(jinro.groupId);
    promises.push(group.finishGroup());

    const replyMessage = await import("../templates/replyAnnounceResult");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(jinro.players)));

    await Promise.all(promises);
    return;
};
