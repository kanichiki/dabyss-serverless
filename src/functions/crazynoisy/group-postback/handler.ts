import line = require('@line/bot-sdk');
import dabyss = require('../../../modules/dabyss');
import crazynoisy = require('../../../modules/crazynoisy');

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

    let groupId!: string;
    let userId!: string;
    if (source.type == "group") {
        groupId = source.groupId;
    } else if (source.type == "room") {
        groupId = source.roomId; // roomIdもgroupId扱いしよう
    }

    if (source.userId != undefined) {
        userId = source.userId;
    }

    const crazyNoisy: crazynoisy.CrazyNoisy = await crazynoisy.CrazyNoisy.createInstance(groupId);
    const status: string = crazyNoisy.gameStatus;

    if (status == "action" && crazyNoisy.day == 0) {
        await crazyNoisy.setAction();
        if (postbackData == "確認状況") {
            await replyConfirmStatus(crazyNoisy, replyToken);
        }
    }

    if (status == "discuss") {
        await crazyNoisy.setDiscussion();
        if (postbackData == "残り時間") {
            return replyRemainingTime(crazyNoisy, replyToken);
        }
    }

    if (status == "vote") {
        await crazyNoisy.setVote();

        const userIndex: number = await crazyNoisy.getUserIndexFromUserId(userId);
        const voteState: boolean = await crazyNoisy.vote.isVotedUser(userIndex);
        if (!voteState) {
            // postbackした参加者の投票がまだの場合

            const votedUserIndex: number = Number(postbackData);
            const isUserCandidate: boolean = await crazyNoisy.vote.isUserCandidate(votedUserIndex);
            if (isUserCandidate) {
                // postbackのデータが候補者のインデックスだった場合

                // ※
                if (userIndex != votedUserIndex) {
                    // 自分以外に投票していた場合
                    return replyVoteSuccess(crazyNoisy, votedUserIndex, userIndex, replyToken);
                } else {
                    // 自分に投票していた場合
                    return replySelfVote(crazyNoisy, userIndex, replyToken);
                }
            }
        } else {
            return replyDuplicateVote(crazyNoisy, userIndex, replyToken);
        }
    }
}

const replyConfirmStatus = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
    const displayNames = await crazyNoisy.getDisplayNames();
    const confirmStatus = crazyNoisy.action.actionStatus;
    let unconfirmed = [];
    for (let i = 0; i < displayNames.length; i++) {
        if (!confirmStatus[i]) {
            unconfirmed.push(displayNames[i]);
        }
    }

    const replyMessage = await import("./template/replyConfirmStatus");
    await dabyss.replyMessage(replyToken, await replyMessage.main(unconfirmed));
}

const replyRemainingTime = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
    const remainingTime = await crazyNoisy.discussion.getRemainingTime();

    const replyMessage = await import("./template/replyRemainingTime");
    await dabyss.replyMessage(replyToken, await replyMessage.main(remainingTime));
};

const replyVoteSuccess = async (crazyNoisy: crazynoisy.CrazyNoisy, votedUserIndex: number, userIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const voterDisplayName = await crazyNoisy.getDisplayName(userIndex);

    await crazyNoisy.vote.vote(userIndex, votedUserIndex);

    let replyMessage: line.Message[] = []

    const replyVoteSuccess = await import("./template/replyVoteSuccess");
    replyMessage = replyMessage.concat(await replyVoteSuccess.main(voterDisplayName));

    const isVoteCompleted: boolean = await crazyNoisy.vote.isVoteCompleted();
    if (isVoteCompleted) {

        const displayNames = await crazyNoisy.getDisplayNames();

        const multipleMostVotedUserExists = await crazyNoisy.vote.multipleMostPolledUserExists();
        if (!multipleMostVotedUserExists) { // 最多得票者が一人だった場合

            const mostVotedUserIndex = await crazyNoisy.vote.getMostPolledUserIndex(); // 最多得票者
            const executorDisplayName = await crazyNoisy.getDisplayName(mostVotedUserIndex);

            const replyExecutor = await import("./template/replyExecutor");
            const replyExecutorMessage = await replyExecutor.main(executorDisplayName);
            replyMessage = replyMessage.concat(replyExecutorMessage);

            const isGuru = await crazyNoisy.isGuru(mostVotedUserIndex); // 最多得票者が教祖かどうか

            if (!isGuru) { // 最多得票者が教祖じゃなかった場合
                replyMessage = replyMessage.concat(await replyExecutorIsNotGuru(crazyNoisy, executorDisplayName, mostVotedUserIndex));

                const isBrainwashCompleted = await crazyNoisy.isBrainwashCompleted();
                if (!isBrainwashCompleted) {

                    replyMessage = replyMessage.concat(await replyVoteFinish(crazyNoisy));

                } else { // 洗脳が完了したら
                    replyMessage = replyMessage.concat(await replyBrainwashCompleted(crazyNoisy));
                }
            } else { // 最多得票者が教祖だった場合
                replyMessage = replyMessage.concat(await replyCitizenWin(crazyNoisy));
            }

        } else { // 最多得票者が複数いた場合
            const mostVotedUserIndexes = await crazyNoisy.vote.getMostPolledUserIndexes(); // 最多得票者の配列
            const isRevoting = (crazyNoisy.vote.count > 1);
            if (!isRevoting) { // 一回目の投票の場合

                const replyRevote = await import("./template/replyRevote");
                const replyRevoteMessage = await replyRevote.main(mostVotedUserIndexes, displayNames);
                replyMessage = replyMessage.concat(replyRevoteMessage);

                // DB変更操作３’，４’
                // 再投票データを作成したら、投票データを初期化する同期処理
                promises.push(crazyNoisy.putRevote());
            } else { // 再投票中だった場合

                const executorIndex = await crazyNoisy.vote.chooseExecutorRandomly(); // 処刑者をランダムで決定
                const executorDisplayName = await crazyNoisy.getDisplayName(executorIndex);

                const replyExecutorInRevote = await import("./template/replyExecutorInRevote");
                const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executorDisplayName);
                replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);

                const isGuru = await crazyNoisy.isGuru(executorIndex); // 最多得票者が教祖かどうか
                if (!isGuru) { // 最多得票者が教祖じゃなかった場合
                    replyMessage = replyMessage.concat(await replyExecutorIsNotGuru(crazyNoisy, executorDisplayName, executorIndex));

                    const isBrainwashCompleted = await crazyNoisy.isBrainwashCompleted();
                    if (!isBrainwashCompleted) {

                        replyMessage = replyMessage.concat(await replyVoteFinish(crazyNoisy));

                    } else { // 洗脳が完了したら
                        replyMessage = replyMessage.concat(await replyBrainwashCompleted(crazyNoisy));
                    }
                } else { // 最多得票者が教祖だった場合
                    replyMessage = replyMessage.concat(await replyCitizenWin(crazyNoisy));
                }
            }

        }
    }
    promises.push(dabyss.replyMessage(replyToken, replyMessage));
    await Promise.all(promises);
    return;
}

const replyExecutorIsNotGuru = async (crazyNoisy: crazynoisy.CrazyNoisy, executorDisplayName: string, executorIndex: number): Promise<line.Message[]> => {
    const promises: Promise<void>[] = [];
    await crazyNoisy.updateBrainwashStateTrue(executorIndex); // 最多投票者洗脳
    promises.push(crazyNoisy.addCrazinessId(executorIndex)); // 最多投票者狂気追加
    const replyExecutorIsNotGuru = await import("./template/replyExecutorIsNotGuru");
    const replyExecutorIsNotGuruMessage = await replyExecutorIsNotGuru.main(executorDisplayName);

    await Promise.all(promises);
    return replyExecutorIsNotGuruMessage;
}

const replyVoteFinish = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
    const promises: Promise<void>[] = [];

    promises.push(crazyNoisy.updateGameStatus("action")); // ステータスをアクション中に

    const displayNames = await crazyNoisy.getDisplayNames();
    promises.push(crazyNoisy.putAction());
    for (let i = 0; i < crazyNoisy.userIds.length; i++) {
        const targetDisplayNames = await crazyNoisy.getDisplayNamesExceptOneself(i);
        const targetIndexes = await crazyNoisy.getUserIndexesExceptOneself(i);

        const isBrainwash = await crazyNoisy.isBrainwash(i);

        const pushUserAction = await import("./template/pushUserAction");
        promises.push(dabyss.pushMessage(crazyNoisy.userIds[i], await pushUserAction.main(displayNames[i], crazyNoisy.positions[i], isBrainwash, targetDisplayNames, targetIndexes)));
    }

    const replyVoteFinish = await import("./template/replyVoteFinish");
    const replyVoteFinishMessage = await replyVoteFinish.main(crazyNoisy.day);

    return replyVoteFinishMessage;
}

const replyBrainwashCompleted = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
    await crazyNoisy.updateGameStatus("winner");
    await crazyNoisy.updateWinner("guru");
    const winnerIndexes = await crazyNoisy.getWinnerIndexes();

    const displayNames = await crazyNoisy.getDisplayNames();
    const replyWinner = await import("./template/replyWinner");
    const replyWinnerMessage = await replyWinner.main(displayNames, true, winnerIndexes);
    return replyWinnerMessage;
}


const replyCitizenWin = async (crazyNoisy: crazynoisy.CrazyNoisy): Promise<line.Message[]> => {
    await crazyNoisy.updateGameStatus("winner");
    await crazyNoisy.updateWinner("citizen");
    const winnerIndexes = await crazyNoisy.getWinnerIndexes();
    console.log("勝者:" + winnerIndexes);

    const displayNames = await crazyNoisy.getDisplayNames();
    const replyWinner = await import("./template/replyWinner");
    const replyWinnerMessage = await replyWinner.main(displayNames, false, winnerIndexes);

    return replyWinnerMessage;

}

const replySelfVote = async (crazyNoisy: crazynoisy.CrazyNoisy, userIndex: number, replyToken: string): Promise<void> => {
    const displayName = await crazyNoisy.getDisplayName(userIndex);
    const replyMessage = await import("./template/replySelfVote");
    await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};

const replyDuplicateVote = async (crazyNoisy: crazynoisy.CrazyNoisy, userIndex: number, replyToken: string): Promise<void> => {
    const displayName = await crazyNoisy.getDisplayName(userIndex);
    const replyMessage = await import("./template/replyDuplicateVote");
    await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};

