import line = require("@line/bot-sdk");
import crazynoisy = require("../../../modules/crazynoisy");
import dabyss = require("../../../modules/dabyss");

exports.handler = async (event: any): Promise<void> => {
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

	const crazyNoisy: crazynoisy.CrazyNoisy = await crazynoisy.CrazyNoisy.createInstance(groupId);
	const status: string = crazyNoisy.gameStatus;

	if (status == "setting") {
		const settingNames = crazyNoisy.settingNames;
		const settingStatus = crazyNoisy.settingStatus;
		if (settingStatus == [] || settingStatus == undefined) {
			const group: dabyss.Group = await dabyss.Group.createInstance(groupId);
			if (group.status == "recruit") {
				return replyRollCallEnd(group, crazyNoisy, replyToken);
			}
		} else {
			const isSettingCompleted = await crazyNoisy.isSettingCompleted();
			if (!isSettingCompleted) {
				for (let i = 0; i < settingNames.length; i++) {
					if (!settingStatus[i]) {
						if (settingNames[i] == "mode") {
							if (text == "ノーマル" || text == "デモ") {
								return replyModeChosen(crazyNoisy, text, replyToken);
							}
						}
						if (settingNames[i] == "type") {
							if (text == "1" || text == "2" || text == "3") {
								await replyTypeChosen(crazyNoisy, text, replyToken);
							}
						}
						break; // これがないと設定繰り返しちゃう
					}
				}
			} else {
				// 設定項目がすべてtrueだったら
				let changeSetting = "";
				switch (text) {
					case "ゲームを開始する":
						await replyConfirmYes(crazyNoisy, replyToken);
						break;
					case "モード変更":
						changeSetting = "mode";
						break;
					case "話し合い方法変更":
						changeSetting = "type";
						break;
					case "議論時間変更":
						changeSetting = "timer";
						break;
					case "0日目洗脳有無":
						changeSetting = "zeroGuru";
						break;
					case "0日目調査有無":
						changeSetting = "zeroDetective";
						break;
				}
				if (changeSetting != "") {
					await replySettingChange(crazyNoisy, changeSetting, replyToken);
				}
			}
		}
	} else if (text == "役職人数確認") {
		await replyPositionNumber(crazyNoisy, replyToken);
	}

	if (status == "discuss") {
		await crazyNoisy.setDiscussion();
		// 話し合い中だった場合

		if (text == "終了") {
			await replyDiscussFinish(crazyNoisy, replyToken);
		}
	}

	if (status == "winner") {
		// すべての結果発表がまだなら
		if (text == "役職・狂気を見る") {
			await replyAnnounceResult(crazyNoisy, replyToken);
		}
	}
};

const replyRollCallEnd = async (
	group: dabyss.Group,
	crazyNoisy: crazynoisy.CrazyNoisy,
	replyToken: string
): Promise<void> => {
	const promises: Promise<void>[] = [];

	const displayNames: string[] = await crazyNoisy.getDisplayNames(); // 参加者の表示名リスト

	// DB変更操作１
	promises.push(crazyNoisy.updateDefaultSettingStatus());
	promises.push(group.updateStatus("play")); // 参加者リストをプレイ中にして、募集中を解除する

	const replyMessage = await import("./template/replyRollCallEnd");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayNames)));

	await Promise.all(promises);
	return;
};

const replyModeChosen = async (crazyNoisy: crazynoisy.CrazyNoisy, text: string, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.updateGameMode(text));
	await crazyNoisy.updateSettingState("mode", true);

	const isSettingCompleted: boolean = await crazyNoisy.isSettingCompleted();
	if (!isSettingCompleted) {
		const replyMessage = await import("./template/replyModeChosen");
		promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(text)));
	} else {
		promises.push(replyConfirm(crazyNoisy, replyToken));
	}

	await Promise.all(promises);
	return;
};

const replyTypeChosen = async (crazyNoisy: crazynoisy.CrazyNoisy, text: string, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.updateTalkType(Number(text)));
	await crazyNoisy.updateSettingState("type", true);

	promises.push(replyConfirm(crazyNoisy, replyToken));

	await Promise.all(promises);
	return;
};

const replySettingChange = async (
	crazyNoisy: crazynoisy.CrazyNoisy,
	setting: string,
	replyToken: string
): Promise<void> => {
	const promises: Promise<void>[] = [];

	if (setting == "mode") {
		promises.push(crazyNoisy.updateSettingState(setting, false)); // 設定状態をfalseに
		const replyMessage = await import("./template/replyModeChange");
		promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
	}
	if (setting == "type") {
		promises.push(crazyNoisy.updateSettingState(setting, false)); // 設定状態をfalseに
		const replyMessage = await import("./template/replyTypeChange");
		promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
	}
	if (setting == "timer") {
		promises.push(crazyNoisy.updateSettingState(setting, false)); // 設定状態をfalseに
		const replyMessage = await import("./template/replyTimerChange");
		promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
	}
	if (setting == "zeroGuru") {
		await crazyNoisy.switchZeroGuru();
		promises.push(replyConfirm(crazyNoisy, replyToken));
	}
	if (setting == "zeroDetective") {
		await crazyNoisy.switchZeroDetective();
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
	promises.push(
		dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, mode, type, timer, zeroGuru, zeroDetective))
	);

	await Promise.all(promises);
	return;
};

const replyConfirmYes = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.updateGameStatus("action"));

	await crazyNoisy.updatePositions();
	const mode = crazyNoisy.gameMode;

	if (mode != "デモ") {
		promises.push(crazyNoisy.updateDefaultCrazinessIds());
	} else {
		promises.push(crazyNoisy.updateDefaultCrazinessIdsInDemo());
	}
	promises.push(crazyNoisy.updateDefaultBrainwashStatus()); // 洗脳ステータスを初期配置
	promises.push(crazyNoisy.putZeroAction()); // 役職確認ステータスを全員falseに

	const userIds = crazyNoisy.userIds;
	const displayNames = await crazyNoisy.getDisplayNames();
	const positions = crazyNoisy.positions;
	const userNumber = await crazyNoisy.getUserNumber();
	const zeroGuru = crazyNoisy.zeroGuru;
	const zeroDetective = crazyNoisy.zeroDetective;

	promises.push(crazyNoisy.putZeroAction());

	for (let i = 0; i < userNumber; i++) {
		const targetDisplayNames = await crazyNoisy.getDisplayNamesExceptOneself(i);
		const targetUserIndexes = await crazyNoisy.getUserIndexesExceptOneself(i);

		const pushPosition = await import("./template/pushUserPosition");
		promises.push(
			dabyss.pushMessage(
				userIds[i],
				await pushPosition.main(
					displayNames[i],
					positions[i],
					targetDisplayNames,
					targetUserIndexes,
					zeroGuru,
					zeroDetective
				)
			)
		);
	}

	const numberOption = Math.floor((userNumber - 1) / 3);

	const replyMessage = await import("./template/replyConfirmYes");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, numberOption)));

	await Promise.all(promises);
	return;
};

const replyPositionNumber = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const userNumber = await crazyNoisy.getUserNumber();
	const numberOption = Math.floor((userNumber - 1) / 3);
	const replyMessage = await import("./template/replyPositionNumber");
	await dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, numberOption));
	return;
};

const replyDiscussFinish = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.discussion.updateIsDiscussingFalse());
	promises.push(crazyNoisy.putFirstVote());
	promises.push(crazyNoisy.updateGameStatus("vote"));

	const userNumber: number = await crazyNoisy.getUserNumber();
	const shuffleUserIndexes: number[] = await dabyss.makeShuffleNumberArray(userNumber);

	const displayNames: string[] = [];

	// 公平にするため投票用の順番はランダムにする
	for (let i = 0; i < userNumber; i++) {
		displayNames[i] = await crazyNoisy.getDisplayName(shuffleUserIndexes[i]);
	}

	//if (usePostback) { // postbackを使う設定の場合
	const replyMessage = await import("./template/replyDiscussFinish");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(shuffleUserIndexes, displayNames)));

	await Promise.all(promises);
	return;
};

const replyAnnounceResult = async (crazyNoisy: crazynoisy.CrazyNoisy, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(crazyNoisy.updateGameStatus("result"));
	const group: dabyss.Group = await dabyss.Group.createInstance(crazyNoisy.groupId);
	promises.push(group.finishGroup());

	const userNumber = await crazyNoisy.getUserNumber();
	const displayNames = await crazyNoisy.getDisplayNames();
	const positions = crazyNoisy.positions;
	const crazinessIds = crazyNoisy.crazinessIds;

	const contentsList: string[][] = [];
	for (let i = 0; i < userNumber; i++) {
		const contents: string[] = [];
		if (crazinessIds[i][0] != null) {
			for (const crazinessId of crazinessIds[i]) {
				const craziness = await crazynoisy.Craziness.createInstance(crazinessId);
				const content = craziness.content;
				contents.push(content);
			}
		}
		contentsList.push(contents);
	}

	const replyMessage = await import("./template/replyAnnounceResult");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayNames, positions, contentsList)));

	await Promise.all(promises);
	return;
};
