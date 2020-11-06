import dabyss = require("../../../modules/dabyss");
import crazynoisy = require("../../../modules/crazynoisy");

export const handleUserPostback = async (
    postbackData: string,
    crazyNoisy: crazynoisy.CrazyNoisy,
    userId: string,
    replyToken: string
): Promise<void> => {
    const status: string = crazyNoisy.gameStatus;
    const day: number = crazyNoisy.day;

    if (status == "action") {
        await crazyNoisy.setAction();
        const userIndex: number = await crazyNoisy.getUserIndexFromUserId(userId);
        const targetIndex = Number(postbackData);

        if (day == 0) {
            // 0日目なら
            const confirmsState: boolean = await crazyNoisy.action.isActedUser(userIndex);
            if (!confirmsState) {
                const position: string = await crazyNoisy.getPosition(userIndex);
                const zeroGuru: boolean = crazyNoisy.zeroGuru;
                const zeroDetective: boolean = crazyNoisy.zeroDetective;

                if (position == crazyNoisy.positionNames.guru && zeroGuru) {
                    const targetExists = await crazyNoisy.existsUserIndexExceptOneself(userIndex, targetIndex);
                    if (targetExists) {
                        await replyBasicAction(crazyNoisy, position, userIndex, targetIndex, replyToken);
                    }
                } else if (position == crazyNoisy.positionNames.detective && zeroDetective) {
                    const targetExists = await crazyNoisy.existsUserIndexExceptOneself(userIndex, targetIndex);
                    if (targetExists) {
                        await replyDetectiveAction(crazyNoisy, userIndex, targetIndex, replyToken);
                    }
                } else {
                    if (postbackData == "確認しました") {
                        await replyPositionConfirm(crazyNoisy, userIndex, replyToken);
                    }
                }
            }
        } else {
            // 0日目以外の場合

            const actionsState = await crazyNoisy.action.isActedUser(userIndex);
            if (!actionsState) {
                // その人のアクションがまだなら

                const targetExists = await crazyNoisy.existsUserIndexExceptOneself(userIndex, targetIndex);
                if (targetExists) {
                    const position = await crazyNoisy.getPosition(userIndex);
                    if (position == crazyNoisy.positionNames.guru) {
                        await replyBasicAction(crazyNoisy, position, userIndex, targetIndex, replyToken);
                    }
                    if (position == crazyNoisy.positionNames.detective) {
                        await replyDetectiveAction(crazyNoisy, userIndex, targetIndex, replyToken);
                    }
                }
            }
        }
    }
};

const replyBasicAction = async (
    crazyNoisy: crazynoisy.CrazyNoisy,
    position: string,
    userIndex: number,
    targetIndex: number,
    replyToken: string
): Promise<void> => {
    const promises: Promise<void>[] = [];

    await crazyNoisy.action.act(userIndex, targetIndex);

    const displayName = await crazyNoisy.getDisplayName(targetIndex);

    if (position == crazyNoisy.positionNames.guru) {
        const replyMessage = await import("../templates/replyGuruAction");
        promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName)));
    }

    const isActionsCompleted = await crazyNoisy.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(crazyNoisy));
    }

    await Promise.all(promises);
    return;
};

const replyDetectiveAction = async (
    crazyNoisy: crazynoisy.CrazyNoisy,
    userIndex: number,
    targetIndex: number,
    replyToken: string
): Promise<void> => {
    const promises: Promise<void>[] = [];

    await crazyNoisy.action.act(userIndex, targetIndex);
    const isGuru = await crazyNoisy.isGuru(targetIndex);
    const displayName = await crazyNoisy.getDisplayName(targetIndex);

    const replyMessage = await import("../templates/replyDetectiveAction");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName, isGuru)));

    const isActionsCompleted = await crazyNoisy.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(crazyNoisy));
    }

    await Promise.all(promises);
    return;
};

const replyPositionConfirm = async (
    crazyNoisy: crazynoisy.CrazyNoisy,
    userIndex: number,
    replyToken: string
): Promise<void> => {
    const promises: Promise<void>[] = [];

    await crazyNoisy.action.updateActionStateTrue(userIndex);

    const replyMessage = await import("../templates/replyPositionConfirm");
    promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));

    const isActionsCompleted = await crazyNoisy.action.isActionCompleted();
    if (isActionsCompleted) {
        promises.push(replyActionCompleted(crazyNoisy));
    }

    await Promise.all(promises);
    return;
};

const replyActionCompleted = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<void> => {
    const promises: Promise<void>[] = [];

    const pushCraziness = await import("../templates/pushUserCraziness");

    const brainwashTarget = await crazyNoisy.getTargetOfPosition(crazyNoisy.positionNames.guru);
    const spTarget = await crazyNoisy.getTargetOfPosition(crazyNoisy.positionNames.sp);
    if (brainwashTarget != -1 && brainwashTarget != spTarget) {
        promises.push(crazyNoisy.updateBrainwashStateTrue(brainwashTarget));
        await crazyNoisy.addCrazinessId(brainwashTarget);
    }

    const userNumber = await crazyNoisy.getUserNumber();

    for (let i = 0; i < userNumber; i++) {
        if (crazyNoisy.crazinessIds[i][0] != null) {
            const contents = [];
            const remarks = [];
            for (const crazinessId of crazyNoisy.crazinessIds[i]) {
                const craziness = await crazynoisy.Craziness.createInstance(crazinessId);

                contents.push(craziness.content);
                remarks.push(craziness.remark);
            }
            promises.push(dabyss.pushMessage(crazyNoisy.userIds[i], await pushCraziness.main(contents, remarks)));
        }
    }

    await crazyNoisy.updateDay(); // 日付更新
    const pushDay = await import("../templates/pushDay");
    let pushMessage = await pushDay.main(crazyNoisy.day);

    const isBrainwashCompleted = await crazyNoisy.isBrainwashCompleted();
    if (!isBrainwashCompleted || crazyNoisy.day == 1) {
        // ゲームが続く場合
        const timer = await crazyNoisy.getTimerString(); // タイマー設定を取得

        const pushFinishActions = await import("../templates/pushFinishActions");
        const pushFinishActionsMessage = await pushFinishActions.main(crazyNoisy.day, timer);

        promises.push(crazyNoisy.updateGameStatus("discuss"));
        promises.push(crazyNoisy.putDiscussion());

        pushMessage = pushMessage.concat(pushFinishActionsMessage);

        promises.push(dabyss.pushMessage(crazyNoisy.groupId, pushMessage));
    } else {
        // 洗脳が完了したら
        await crazyNoisy.updateGameStatus("winner"); // 勝者発表状況をtrueにする
        const isWinnerGuru = true;
        const winnerIndexes = await crazyNoisy.getWinnerIndexes();

        const replyWinner = await import("../templates/replyWinner");
        const displayNames = await crazyNoisy.getDisplayNames();
        const pushWinnerMessage = await replyWinner.main(displayNames, isWinnerGuru, winnerIndexes);

        pushMessage = pushMessage.concat(pushWinnerMessage);
        promises.push(dabyss.pushMessage(crazyNoisy.groupId, pushMessage));
    }

    await Promise.all(promises);
    return;
};
