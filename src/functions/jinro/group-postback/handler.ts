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

    const jinro: jinro_module.Jinro = await jinro_module.Jinro.createInstance(groupId);
    const status: string = jinro.gameStatus;

    if (status == "action" && jinro.day == 0) {
        await jinro.setAction();
        if (postbackData == "確認状況") {
            await replyConfirmStatus(jinro, replyToken);
        }
    }

    if (status == "discuss") {
        await jinro.setDiscussion();
        if (postbackData == "残り時間") {
            return replyRemainingTime(jinro, replyToken);
        }
    }

    if (status == "vote") {
        await jinro.setVote();

        const userIndex: number = await jinro.getUserIndexFromUserId(userId);
        const voteState: boolean = await jinro.vote.isVotedUser(userIndex);
        if (!voteState) {
            // postbackした参加者の投票がまだの場合

            const votedUserIndex: number = Number(postbackData);
            const isUserCandidate: boolean = await jinro.vote.isUserCandidate(votedUserIndex);
            if (isUserCandidate) {
                // postbackのデータが候補者のインデックスだった場合

                // ※
                if (userIndex != votedUserIndex) {
                    // 自分以外に投票していた場合
                    return replyVoteSuccess(jinro, votedUserIndex, userIndex, replyToken);
                } else {
                    // 自分に投票していた場合
                    return replySelfVote(jinro, userIndex, replyToken);
                }
            }
        } else {
            return replyDuplicateVote(jinro, userIndex, replyToken);
        }
    }
}

const replyConfirmStatus = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const displayNames = await jinro.getDisplayNames();
    const confirmStatus = jinro.action.actionStatus;
    let unconfirmed = [];
    for (let i = 0; i < displayNames.length; i++) {
        if (!confirmStatus[i]) {
            unconfirmed.push(displayNames[i]);
        }
    }

    const replyMessage = await import("./template/replyConfirmStatus");
    await dabyss.replyMessage(replyToken, await replyMessage.main(unconfirmed));
}

const replyRemainingTime = async (jinro: jinro_module.Jinro, replyToken: string): Promise<void> => {
    const remainingTime = await jinro.discussion.getRemainingTime();

    const replyMessage = await import("./template/replyRemainingTime");
    await dabyss.replyMessage(replyToken, await replyMessage.main(remainingTime));
};

const replyVoteSuccess = async (jinro: jinro_module.Jinro, votedUserIndex: number, userIndex: number, replyToken: string): Promise<void> => {
    const promises: Promise<void>[] = [];

    const voterDisplayName = await jinro.getDisplayName(userIndex);

    await jinro.vote.vote(userIndex, votedUserIndex);

    let replyMessage: line.Message[] = []

    const replyVoteSuccess = await import("./template/replyVoteSuccess");
    replyMessage = replyMessage.concat(await replyVoteSuccess.main(voterDisplayName));

    const isVoteCompleted: boolean = await jinro.vote.isVoteCompleted();
    if (isVoteCompleted) {

        const displayNames = await jinro.getDisplayNames();

        const multipleMostVotedUserExists = await jinro.vote.multipleMostPolledUserExists();
        if (!multipleMostVotedUserExists) { // 最多得票者が一人だった場合

            const mostVotedUserIndex = await jinro.vote.getMostPolledUserIndex(); // 最多得票者
            const executorDisplayName = await jinro.getDisplayName(mostVotedUserIndex);

            const replyExecutor = await import("./template/replyExecutor");
            const replyExecutorMessage = await replyExecutor.main(executorDisplayName);
            replyMessage = replyMessage.concat(replyExecutorMessage);

            const isWerewolf = await jinro.isWerewolf(mostVotedUserIndex); // 最多得票者が教祖かどうか

            if (!isWerewolf) { // 最多得票者が教祖じゃなかった場合
                replyMessage = replyMessage.concat(await replyExecutorIsNotWerewolf(jinro, executorDisplayName, mostVotedUserIndex));

                const isWerewolfWin = await jinro.isWerewolfWin();
                if (!isWerewolfWin) {

                    replyMessage = replyMessage.concat(await replyVoteFinish(jinro));

                } else { // 死亡が完了したら
                    replyMessage = replyMessage.concat(await replyBiteCompleted(jinro));
                }
            } else { // 最多得票者が教祖だった場合
                replyMessage = replyMessage.concat(await replyCitizenWin(jinro));
            }

        } else { // 最多得票者が複数いた場合
            const mostVotedUserIndexes = await jinro.vote.getMostPolledUserIndexes(); // 最多得票者の配列
            const isRevoting = (jinro.vote.count > 1);
            if (!isRevoting) { // 一回目の投票の場合

                const replyRevote = await import("./template/replyRevote");
                const replyRevoteMessage = await replyRevote.main(mostVotedUserIndexes, displayNames);
                replyMessage = replyMessage.concat(replyRevoteMessage);

                // DB変更操作３’，４’
                // 再投票データを作成したら、投票データを初期化する同期処理
                promises.push(jinro.putRevote());
            } else { // 再投票中だった場合

                const executorIndex = await jinro.vote.chooseExecutorRandomly(); // 処刑者をランダムで決定
                const executorDisplayName = await jinro.getDisplayName(executorIndex);

                const replyExecutorInRevote = await import("./template/replyExecutorInRevote");
                const replyExecutorInRevoteMessage = await replyExecutorInRevote.main(executorDisplayName);
                replyMessage = replyMessage.concat(replyExecutorInRevoteMessage);

                const isWerewolf = await jinro.isWerewolf(executorIndex); // 最多得票者が教祖かどうか
                if (!isWerewolf) { // 最多得票者が教祖じゃなかった場合
                    replyMessage = replyMessage.concat(await replyExecutorIsNotWerewolf(jinro, executorDisplayName, executorIndex));

                    const isWerewolfWin = await jinro.isWerewolfWin();
                    if (!isWerewolfWin) {

                        replyMessage = replyMessage.concat(await replyVoteFinish(jinro));

                    } else { // 洗脳が完了したら
                        replyMessage = replyMessage.concat(await replyBiteCompleted(jinro));
                    }
                } else { // 最多得票者が教祖だった場合
                    replyMessage = replyMessage.concat(await replyCitizenWin(jinro));
                }
            }

        }
    }
    promises.push(dabyss.replyMessage(replyToken, replyMessage));
    await Promise.all(promises);
    return;
}

const replyExecutorIsNotWerewolf = async (jinro: jinro_module.Jinro, executorDisplayName: string, executorIndex: number): Promise<line.Message[]> => {
    const promises: Promise<void>[] = [];
    await jinro.die(executorIndex); // 最多投票者洗脳
    const replyExecutorIsNotWerewolf = await import("./template/replyExecutorIsNotWerewolf");
    const replyExecutorIsNotWerewolfMessage = await replyExecutorIsNotWerewolf.main(executorDisplayName);

    await Promise.all(promises);
    return replyExecutorIsNotWerewolfMessage;
}

const replyVoteFinish = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
    const promises: Promise<void>[] = [];

    promises.push(jinro.updateGameStatus("action")); // ステータスをアクション中に

    const displayNames = await jinro.getDisplayNames();
    promises.push(jinro.setAction());
    for (let i = 0; i < jinro.userIds.length; i++) {
        const isAlive = await jinro.isAlive(i);
        if (isAlive) {
            const targetAliveDisplayNames = await jinro.getDisplayNamesExceptOneself(i);
            const targetDeadDisplayNames = await jinro.getDisplayNamesExceptOneself(i);
            const targetIndexes = await jinro.getUserIndexesExceptOneself(i);
            const deadIndexes = await jinro.getDeadIndexes();

            const pushUserAction = await import("./template/pushUserAction");
            promises.push(dabyss.pushMessage(jinro.userIds[i], await pushUserAction.main(displayNames[i], jinro.positions[i], isAlive, targetAliveDisplayNames, targetDeadDisplayNames, targetIndexes, deadIndexes)));
        }
    }

    const replyVoteFinish = await import("./template/replyVoteFinish");
    const replyVoteFinishMessage = await replyVoteFinish.main(jinro.day);

    await Promise.all(promises);
    return replyVoteFinishMessage;
}

const replyBiteCompleted = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
    await jinro.updateGameStatus("winner");
    await jinro.updateWinner("werewolf");
    const winnerIndexes = await jinro.getWinnerIndexes();

    const displayNames = await jinro.getDisplayNames();
    const replyWinner = await import("./template/replyWinner");
    const replyWinnerMessage = await replyWinner.main(displayNames, true, winnerIndexes);
    return replyWinnerMessage;
}


const replyCitizenWin = async (jinro: jinro_module.Jinro): Promise<line.Message[]> => {
    await jinro.updateGameStatus("winner"); // 勝者発表状況をtrueにする
    const winnerIndexes = await jinro.getWinnerIndexes();

    const displayNames = await jinro.getDisplayNames();
    const replyWinner = await import("./template/replyWinner");
    const replyWinnerMessage = await replyWinner.main(displayNames, false, winnerIndexes);

    return replyWinnerMessage;

}

const replySelfVote = async (jinro: jinro_module.Jinro, userIndex: number, replyToken: string): Promise<void> => {
    const displayName = await jinro.getDisplayName(userIndex);
    const replyMessage = await import("./template/replySelfVote");
    await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};

const replyDuplicateVote = async (jinro: jinro_module.Jinro, userIndex: number, replyToken: string): Promise<void> => {
    const displayName = await jinro.getDisplayName(userIndex);
    const replyMessage = await import("./template/replyDuplicateVote");
    await dabyss.replyMessage(replyToken, await replyMessage.main(displayName));
};
