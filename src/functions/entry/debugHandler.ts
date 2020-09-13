import line = require("@line/bot-sdk");
import dabyss = require("../../modules/dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as wordwolf from "../wordwolf/handler";
import * as crazynoisy from "../crazynoisy/handler";
import * as jinro from "../jinro/handler";

export const handler = async (lineEvent: line.MessageEvent | line.PostbackEvent): Promise<void> => {
	const promises: Promise<void>[] = [];
	promises.push(handleEvent(lineEvent));

	const replyToken = lineEvent.replyToken;
	const eventTable = process.env.eventTable;
	const data = await dabyss.dynamoQuery(eventTable, "reply_token", replyToken);
	if (data.Count == 1) {
		console.log("duplicate event");
	} else {
		const item: DocumentClient.AttributeMap = {
			reply_token: replyToken,
			event: lineEvent,
		};
		promises.push(dabyss.dynamoPut(eventTable, item));
	}

	await Promise.all(promises);
	return;
};

const handleEvent = async (lineEvent: line.MessageEvent | line.PostbackEvent): Promise<void> => {
	const replyToken = lineEvent.replyToken;

	if (lineEvent.source.userId != undefined) {
		const userId: string = lineEvent.source.userId;
		const user: dabyss.User = await dabyss.User.createInstance(userId);

		let isFriend = true;
		try {
			await dabyss.getProfile(userId);
		} catch (err) {
			isFriend = false;
		}

		// TODO 友達追加されていないユーザーの場合の分岐
		if (isFriend) {
			if (lineEvent.type == "message") {
				if (lineEvent.message.type == "text") {
					// テキストメッセージイベントなら
					const text: string = lineEvent.message.text;

					if (lineEvent.source.type == "group" || lineEvent.source.type == "room") {
						let groupId!: string;
						if (lineEvent.source.type == "group") {
							groupId = lineEvent.source.groupId;
						} else if (lineEvent.source.type == "room") {
							groupId = lineEvent.source.roomId; // roomIdもgroupId扱いします
						}
						const group: dabyss.Group = await dabyss.Group.createInstance(groupId);

						if (text == "ゲーム一覧") {
							return replyGameList(replyToken);
						}

						const groupExists: boolean = group.exists;
						const isUser: boolean = user.exists; // ユーザーのデータがあるかどうか

						const gameNameExists: boolean = await dabyss.Game.gameJPNameExists(text);
						if (gameNameExists) {
							// 発言内容がゲーム名なら
							if (groupExists) {
								const isRestarting: boolean = group.isRestarting;
								if (!isRestarting) {
									const status: string = group.status;
									if (status == "recruit") {
										// 参加者募集中のゲームがあるが新しくゲームの参加者を募集するかどうかを聞く旨のリプライを返す
										return replyRestartConfirmIfRecruiting(group, replyToken);
									}
									if (status == "play") {
										const game: dabyss.Game = await dabyss.Game.createInstance(groupId);
										const isUserParticipate: boolean = await game.isUserExists(userId);
										if (isUserParticipate) {
											// 参加者の発言の場合

											// プレイ中のゲームがあるが新しくゲームの参加者を募集するかどうかを聞く旨のリプライを返す
											return replyRestartConfirmIfPlaying(group, replyToken);
										}
									}
								}
							}

							// 参加を募集する旨のリプライを返す
							return replyRollCall(group, text, replyToken);
						} else {
							// 発言の内容がゲーム名じゃないなら
							if (groupExists) {
								const status: string = group.status;

								await group.updateIsRestarting(false); // 発言グループのリスタート待ちを解除

								if (status == "recruit") {
									// 参加者募集中の場合
									const game: dabyss.Game = await dabyss.Game.createInstance(groupId);

									if (text == "参加") {
										if (isUser) {
											// ユーザーテーブルにデータがあるか
											const hasGroupId: boolean = await user.hasGroupId();
											const isUserParticipate: boolean = await game.isUserExists(userId); // 発言ユーザーが参加者かどうか
											if (hasGroupId && !isUserParticipate) {
												// ユーザーに参加中のgroupがあってそれが当該グループではない場合

												const isUserRestarting: boolean = user.isRestarting;
												if (!isUserRestarting) {
													// restart待ちじゃなかったら

													return replyParticipateConfirm(user, replyToken);
												}
											}
										}
										// 参加意思表明に対するリプライ
										// 参加を受け付けた旨、現在の参加者のリスト、参加募集継続中の旨を送る
										return replyParticipate(game, user, replyToken);
									} else {
										if (isUser) {
											await user.updateIsRestarting(false); // もし「参加」以外の言葉がユーザーから発言されたら確認状況をリセットする
										}
									}

									const isUserParticipate: boolean = await game.isUserExists(userId); // 発言ユーザーが参加者かどうか
									if (isUserParticipate) {
										// 参加受付を終了できるのは参加済みの者のみ

										if (text == "受付終了") {
											const userNumber: number = await game.getUserNumber();
											const minNumber: number = await game.getMinNumber();
											if (userNumber < minNumber) {
												// 参加者数が規定数以下の場合
												return replyTooFewParticipant(game, replyToken);
											} else {
												// 参加受付終了の意思表明に対するリプライ
												// 参加受付を終了した旨（TODO 参加者を変更したい場合はもう一度「参加者が」ゲーム名を発言するように言う）、参加者のリスト、該当ゲームの最初の設定のメッセージを送る
												return callGameHandler(game, lineEvent);
											}
										}
									}
								}

								if (status == "play") {
									// プレイ中の場合
									const game: dabyss.Game = await dabyss.Game.createInstance(groupId);

									const isUserParticipate = await game.isUserExists(userId);
									if (isUserParticipate) {
										// 参加者の発言の場合
										//     if (text == "強制終了") {
										//         await replyTerminate(plId, replyToken);
										//         continue;
										//     }

										return callGameHandler(game, lineEvent);
									}
								}
							}
						}

						// await replyDefaultGroupMessage(lineEvent));
					}
				}
			}
			if (lineEvent.type == "postback") {
				if (lineEvent.source.type == "group" || lineEvent.source.type == "room") {
					let groupId = "";
					if (lineEvent.source.type == "group") {
						groupId = lineEvent.source.groupId;
					} else if (lineEvent.source.type == "room") {
						groupId = lineEvent.source.roomId; // roomIdもgroupId扱いしよう
					}

					const group: dabyss.Group = await dabyss.Group.createInstance(groupId);
					const groupExists: boolean = group.exists;

					if (groupExists) {
						const status = group.status;
						if (status == "play") {
							const game: dabyss.Game = await dabyss.Game.createInstance(groupId);
							const isUserParticipate: boolean = await game.isUserExists(userId);
							if (isUserParticipate) {
								return callGameHandler(game, lineEvent);
							}
						}
					}
				}
				if (lineEvent.source.type == "user") {
					const groupId: string = user.groupId;
					const group: dabyss.Group = await dabyss.Group.createInstance(groupId);
					const groupExists: boolean = group.exists;

					if (groupExists) {
						const status: string = group.status;
						if (status == "play") {
							const game: dabyss.Game = await dabyss.Game.createInstance(groupId);
							const isUserParticipate: boolean = await game.isUserExists(userId);
							if (isUserParticipate) {
								return callGameHandler(game, lineEvent);
							}
						}
					}
				}
			}
		}
	}

	return;
};

/**
 * ゲームリストを返す
 *
 * @param {*} replyToken
 */
const replyGameList = async (replyToken: string): Promise<void> => {
	const replyMessage = await import("./template/replyGameList");
	await dabyss.replyMessage(replyToken, await replyMessage.main());
	return;
};

const replyRollCall = async (group: dabyss.Group, text: string, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const replyMessage = await import("./template/replyRollCall");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(text)));

	if (group.exists) {
		promises.push(group.resetGroup());
	} else {
		promises.push(group.putGroup());
	}

	const game = await dabyss.Game.createInstance(group.groupId);
	promises.push(game.putGame(text));

	await Promise.all(promises);
	return;
};

const replyParticipate = async (game: dabyss.Game, user: dabyss.User, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];
	const displayName: string = await user.getDisplayName();

	const isUserParticipant: boolean = await game.isUserExists(user.userId);
	// DB変更操作１
	if (!isUserParticipant) {
		// ユーザーがまだ参加してない場合
		const displayNameExists: boolean = await game.displayNameExists(displayName);
		if (!displayNameExists) {
			// 同じ名前の参加者が存在しなければ

			const displayNames: string[] = await game.getDisplayNames(); // 参加者リストのユーザー全員の表示名の配列
			displayNames.push(displayName);
			const gameName = await game.getJpGameName();
			const replyMessage = await import("./template/replyParticipate");
			promises.push(
				dabyss.replyMessage(replyToken, await replyMessage.main(gameName, displayName, displayNames))
			);

			promises.push(game.appendUserId(user.userId));

			const isUser: boolean = user.exists;
			if (isUser) {
				// ユーザーデータがある場合

				const isUserRestarting: boolean = user.isRestarting;
				if (isUserRestarting) {
					// ユーザーがリスタート待ちの場合

					const hasGroupId: boolean = await user.hasGroupId();
					if (hasGroupId) {
						// リスタート待ちの間に消えてる可能性もあるので

						const oldGroupId = user.groupId;
						if (game.groupId != oldGroupId) {
							const oldGroup: dabyss.Group = await dabyss.Group.createInstance(oldGroupId);
							promises.push(oldGroup.finishGroup());

							try {
								const pushMessage = await import("./template/pushGameFinish");
								// 終了したゲームのグループにその旨を送る
								promises.push(dabyss.pushMessage(oldGroupId, await pushMessage.main()));
							} catch (err) {
								console.log(err);
							}
						}
					}
				}

				promises.push(user.updateGroupId(game.groupId));
			} else {
				promises.push(user.putUser(game.groupId));
			}
		} else {
			// 同じ名前のユーザーが存在するなら
			const replyMessage = await import("./template/replyDisplayNameExists");
			promises.push(dabyss.replyMessage(replyToken, await replyMessage.main()));
		}
	} else {
		// 既に参加していた場合
		const replyMessage = await import("./template/replyAlreadyParticipate");
		promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName)));
	}
	await Promise.all(promises);
	return;
};

const replyParticipateConfirm = async (user: dabyss.User, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	promises.push(user.updateIsRestarting(true)); // 確認状況をtrueにする
	const displayName = await user.getDisplayName();

	const replyMessage = await import("./template/replyParticipateConfirm");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(displayName)));

	await Promise.all(promises);
	return;
};

const replyRestartConfirmIfRecruiting = async (group: dabyss.Group, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const game: dabyss.Game = await dabyss.Game.createInstance(group.groupId);

	promises.push(group.updateIsRestarting(true)); // 参加者リストをリスタート待ちにする

	const recruitingGameName = await game.getJpGameName();

	// 一応newGameNameも渡すがまだ使ってない
	// TODO is_restartingをrestart_game_idに変更する
	const replyMessage = await import("./template/replyRestartConfirmIfRecruiting");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(recruitingGameName)));

	await Promise.all(promises);
	return;
};

const replyRestartConfirmIfPlaying = async (group: dabyss.Group, replyToken: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const game: dabyss.Game = await dabyss.Game.createInstance(group.groupId);

	promises.push(group.updateIsRestarting(true)); // 参加者リストをリスタート待ちにする

	const playingGameName = await game.getJpGameName();

	// 一応newGameNameも渡すがまだ使ってない
	const replyMessage = await import("./template/replyRestartConfirmIfPlaying");
	promises.push(dabyss.replyMessage(replyToken, await replyMessage.main(playingGameName)));

	await Promise.all(promises);
	return;
};

const replyTooFewParticipant = async (game: dabyss.Game, replyToken: string): Promise<void> => {
	const userNumber = await game.getUserNumber(); // 参加者数
	const recruitingGameName = game.gameName;
	const minNumber = await game.getMinNumber();

	const replyMessage = await import("./template/replyTooFewParticipant");
	await dabyss.replyMessage(replyToken, await replyMessage.main(userNumber, recruitingGameName, minNumber));
	return;
};

const callGameHandler = async (game: dabyss.Game, lineEvent: line.MessageEvent | line.PostbackEvent) => {
	switch (game.gameName) {
		case "wordwolf":
			await wordwolf.handler(lineEvent);
			break;
		case "crazynoisy":
			await crazynoisy.handler(lineEvent);
			break;
		case "jinro":
			await jinro.handler(lineEvent);
			break;
	}
	return;
};
