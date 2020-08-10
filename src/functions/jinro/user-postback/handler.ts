import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');
import jinro_module = require('../../../modules/jinro');

process.on('uncaughtException', function (err) {
    console.log(err);
});

exports.handler = async (event: any, context: any): Promise<void> => {
    const lineEvent: line.PostbackEvent = event.Input.event;
    console.log(lineEvent);

    const replyToken: string = lineEvent.replyToken;
    const postback: line.Postback = lineEvent.postback;
    const postbackData: string = postback.data;
    const source: line.EventSource = lineEvent.source;

    let userId!: string;
    if (source.userId != undefined) {
        userId = source.userId;
    }
    const user: dabyss.User = await dabyss.User.createInstance(userId);
    const groupId: string = user.groupId;

    const jinro: jinro_module.Jinro = await jinro_module.Jinro.createInstance(groupId);
    const status: string = jinro.gameStatus;
    const day: number = jinro.day;

    if (status == "action") {
        await jinro.setAction();
        const userIndex: number = await jinro.getUserIndexFromUserId(userId);
        const targetIndex: number = Number(postbackData);

        if (day == 0) { // 0日目なら
            const confirmsState: boolean = await jinro.action.isActedUser(userIndex);
            if (!confirmsState) {
                const position: string = await jinro.getPosition(userIndex);

                if (position == jinro.positionNames.werewolf && false) {
                    const targetExists = await jinro.existsUserIndexExceptOneself(userIndex, targetIndex);
                    if (targetExists) {
                        await replyBasicAction(jinro, position, userIndex, targetIndex, replyToken);
                    }

                } else if (position == jinro.positionNames.forecaster) {
                    const targetExists = await jinro.existsUserIndexExceptOneself(userIndex, targetIndex);
                    if (targetExists) {

                        await replyForecasterAction(jinro, userIndex, targetIndex, replyToken);
                    }

                } else {
                    if (postbackData == "確認しました") {
                        await replyPositionConfirm(jinro, userIndex, replyToken);
                    }
                }
            }
        } else { // 0日目以外の場合

            const actionsState = await jinro.action.isActedUser(userIndex);
            if (!actionsState) { // その人のアクションがまだなら

                const targetExists = await jinro.existsUserIndexExceptOneself(userIndex, targetIndex);
                if (targetExists) {
                    const position = await jinro.getPosition(userIndex);
                    if (position == jinro.positionNames.werewolf || jinro.positionNames.hunter) {
                        await replyBasicAction(jinro, position, userIndex, targetIndex, replyToken);
                    }
                    if (position == jinro.positionNames.forecaster) {
                        await replyForecasterAction(jinro, userIndex, targetIndex, replyToken);
                    }
                    if (position == jinro.positionNames.psychic) {
                        await replyPsychicAction(jinro, userIndex, targetIndex, replyToken);
                    }
                }
            }
        }
    }
}

const replyBasicAction = async (jinro: jinro_module.Jinro, position: string, userIndex: number, targetIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    await jinro.action.act(userIndex, targetIndex)

    const displayName = await jinro.getDisplayName(targetIndex);

    if (position == jinro.positionNames.werewolf) {
        const replyMessage = await import("./template/replyWerewolfAction");
        promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName)));
    }
    if (position == jinro.positionNames.hunter) {
        const replyMessage = await import("./template/replyHunterAction");
        promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName)));
    }

    const isActionsCompleted = await jinro.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(jinro));
    }

    await Promise.all(promises);
    return;
}

const replyForecasterAction = async (jinro: jinro_module.Jinro, userIndex: number, targetIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    await jinro.action.act(userIndex, targetIndex);
    const isWerewolf = await jinro.isWerewolf(targetIndex);
    const displayName = await jinro.getDisplayName(targetIndex);

    const replyMessage = await import("./template/replyForecasterAction");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName, isWerewolf)));

    const isActionsCompleted = await jinro.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(jinro));
    }

    await Promise.all(promises);
    return;
}

const replyPsychicAction = async (jinro: jinro_module.Jinro, userIndex: number, targetIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    await jinro.action.act(userIndex, targetIndex);
    const isWerewolf = await jinro.isWerewolf(targetIndex);
    const displayName = await jinro.getDisplayName(targetIndex);

    const replyMessage = await import("./template/replyPsychicAction");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName, isWerewolf)));

    const isActionsCompleted = await jinro.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(jinro));
    }

    await Promise.all(promises);
    return;
}

const replyPositionConfirm = async (jinro: jinro_module.Jinro, userIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    await jinro.action.updateActionStateTrue(userIndex);

    const replyMessage = await import("./template/replyPositionConfirm")
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));

    const isActionsCompleted = await jinro.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(jinro));
    }

    await Promise.all(promises);
    return;
}

const replyActionCompleted = async (jinro: jinro_module.Jinro): Promise<void> => {
    const promises: Promise<void>[] = [];

    const biteTarget = await jinro.getTargetOfPosition(jinro.positionNames.werewolf);
    const protectTarget = await jinro.getTargetOfPosition(jinro.positionNames.hunter);
    if (biteTarget != -1 && biteTarget != protectTarget) {
        promises.push(jinro.die(biteTarget));
    }

    const userNumber = await jinro.getUserNumber();


    await jinro.updateDay(); // 日付更新
    const pushDay = await import("./template/pushDay");
    let pushMessage = await pushDay.main(jinro.day);

    const isWerewolfWin = await jinro.isWerewolfWin();
    if (!isWerewolfWin || jinro.day == 1) { // ゲームが続く場合
        const timer = await jinro.getTimerString(); // タイマー設定を取得

        const pushFinishActions = await import("./template/pushFinishActions");
        const pushFinishActionsMessage = await pushFinishActions.main(jinro.day, timer);

        promises.push(jinro.updateGameStatus("discuss"));
        promises.push(jinro.putDiscussion());

        pushMessage = pushMessage.concat(pushFinishActionsMessage);

        promises.push(dabyss.pushMessage(jinro.groupId, pushMessage));

    } else { // 襲撃が完了したら
        await jinro.updateGameStatus("winner"); // 勝者発表状況をtrueにする
        const isWinnerWerewolf = true;
        const winnerIndexes = await jinro.getWinnerIndexes();

        const replyWinner = await import("./template/replyWinner");
        const displayNames = await jinro.getDisplayNames();
        const pushWinnerMessage = await replyWinner.main(displayNames, isWinnerWerewolf, winnerIndexes);

        pushMessage = pushMessage.concat(pushWinnerMessage);
        promises.push(dabyss.pushMessage(jinro.groupId, pushMessage));
    }

    await Promise.all(promises);
    return;
}