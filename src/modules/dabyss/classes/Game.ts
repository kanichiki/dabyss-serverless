import * as aws from "../clients/awsClient";
import { User } from "./User";
import { Discussion } from "./Discussion";
import { Vote } from "./Vote";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Action } from "./Action";

// インスタンス変数にしちゃうとstatic関数で参照できないから
const games: { [key: string]: { jpName: string; minNumber: number; functionName: string } } = {
	wordwolf: {
		jpName: "ワードウルフ",
		minNumber: 2,
		functionName: process.env.wordwolfFunction,
	},
	crazynoisy: {
		jpName: "クレイジーノイジー",
		minNumber: 2,
		functionName: process.env.crazynoisyFunction,
	},
	jinro: {
		jpName: "人狼",
		minNumber: 2,
		functionName: process.env.jinroFunction,
	},
};

const gameTable: string = process.env.gameTable;

/**
 * ゲームのクラス
 * それぞれのゲームデータで参加者のデータを持ってる
 *
 * gameテーブルは
 * partition key : group_id
 * sort key : game_id
 *
 * game_idはオートインクリメント
 * よってgroup_idで降順でqueryして得られたデータの1番目が現在そのグループで行われてるゲーム
 *
 * @export
 * @class Game
 */
export class Game {
	settingNames: string[];
	defaultSettingStatus: boolean[];
	exists: boolean;

	groupId: string;
	gameId: number;
	gameKey: DocumentClient.Key;
	userIds: string[];
	day: number;
	gameName: string;
	gameStatus: string;
	settingStatus: boolean[];
	timer: string;
	winner: string;
	positions: string[];

	discussion: Discussion;
	vote: Vote;
	action: Action;

	/**
	 * Gameインスタンス作成
	 *
	 * @constructor
	 * @param {string} groupId
	 * @memberof Game
	 */

	constructor(groupId: string) {
		this.settingNames = [];
		this.defaultSettingStatus = [];
		this.exists = false;

		this.groupId = groupId;
		this.gameId = -1;
		this.gameKey = {
			group_id: this.groupId,
			game_id: this.gameId,
		};
		this.userIds = [];
		this.day = -1;
		this.gameName = "";
		this.gameStatus = "";
		this.settingStatus = [];
		this.timer = "00:03:00";
		this.winner = "";
		this.positions = [];

		this.discussion = new Discussion(this.gameId, this.day, this.groupId);
		this.vote = new Vote(this.gameId);
		this.action = new Action(this.gameId, this.day);
	}

	/**
	 * ゲームの名前が存在するかどうかを返す
	 *
	 * @static
	 * @param {string} text
	 * @returns {Promise<boolean>}
	 * @memberof Game
	 */
	static async gameJPNameExists(text: string): Promise<boolean> {
		let res = false;
		for (const game of Object.keys(games)) {
			if (text == games[game].jpName) {
				res = true;
			}
		}
		return res;
	}

	static async getFunctionName(gameName: string): Promise<string> {
		return games[gameName].functionName;
	}

	async getGameName(jpName: string): Promise<string> {
		let res: string;
		for (const game of Object.keys(games)) {
			if (jpName == games[game].jpName) {
				res = game;
			}
		}
		return res;
	}

	async getJpGameName(): Promise<string> {
		return this.gameName ? games[this.gameName].jpName : "";
	}

	/**
	 * ゲームデータを引っ張ってきてそれぞれインスタンス変数に代入
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async init(): Promise<void> {
		try {
			const data: DocumentClient.QueryOutput = await aws.dynamoQuery(gameTable, "group_id", this.groupId, false);
			if (data.Count != undefined) {
				if (data.Count > 0) {
					this.exists = true;

					if (data.Items != undefined) {
						const game: DocumentClient.AttributeMap = data.Items[0];
						this.gameId = game.game_id as number;
						this.gameKey = {
							group_id: this.groupId,
							game_id: this.gameId,
						};
						this.userIds = game.user_ids as string[];
						this.day = game.day as number;
						this.gameName = game.game_name as string;
						this.gameStatus = game.game_status as string;
						this.settingStatus = game.setting_status as boolean[];
						this.timer = game.timer as string;
						this.winner = game.winner as string;
						this.positions = game.positions as string[];
					}
				}
			}
		} catch (err) {
			console.error(err);
			console.error("gameの初期化失敗");
		}
	}

	/**
	 * Gameインスタンスを作る
	 * constructorでasyncが使えないので。
	 *
	 * @static
	 * @param {string} groupId
	 * @returns {Promise<Game>}
	 * @memberof Game
	 */
	static async createInstance(groupId: string): Promise<Game> {
		const game: Game = new Game(groupId);
		await game.init();
		return game;
	}

	async update(): Promise<void> {
		const game = {
			game_id: this.gameId,
			user_ids: this.userIds,
			day: this.day,
			game_name: this.gameName,
			game_status: this.gameStatus,
			setting_status: this.settingStatus,
			timer: this.timer,
			winner: this.winner,
			positions: this.positions
		};
		await aws.dynamoUpdate(gameTable, game)
	}
	/**
	 * ゲームデータ挿入
	 *
	 * @param {string} jpName
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async putGame(jpName: string): Promise<void> {
		const items: DocumentClient.QueryOutput = await aws.dynamoScan(gameTable, 1);
		this.gameId = items.Items[0].game_id + 1;

		const gameName = await this.getGameName(jpName);
		const item: DocumentClient.AttributeMap = {
			group_id: this.groupId,
			game_id: this.gameId,
			user_ids: [],
			game_status: "setting",
			game_name: gameName,
			day: 0,
			timer: "00:03:00",
		};
		// groupデータをputできたらsequenceをプラス１
		await aws.dynamoPut(gameTable, item).catch((err) => console.log(err));
	}

	/**
	 * 日付更新
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateDay(): Promise<void> {
		this.day++;
		await this.update();
	}

	/**
	 * 参加者の表示名の配列を取得
	 *
	 * @returns {Promise<string[]>}
	 * @memberof Game
	 */
	async getDisplayNames(): Promise<string[]> {
		const res: string[] = [];
		for (const userId of this.userIds) {
			const user: User = new User(userId);
			const displayName: string = await user.getDisplayName();
			res.push(displayName);
		}
		return res;
	}

	/**
	 * 入力ユーザー以外の表示名を配列で取得
	 *
	 * @param {number} index
	 * @returns {Promise<string[]>}
	 * @memberof Game
	 */
	async getDisplayNamesExceptOneself(index: number): Promise<string[]> {
		const res: string[] = [];
		for (let i = 0; i < this.userIds.length; i++) {
			if (i != index) {
				const user: User = new User(this.userIds[i]);
				const displayName: string = await user.getDisplayName();
				res.push(displayName);
			}
		}
		return res;
	}

	/**
	 * 入力ユーザー以外のインデックス配列取得
	 *
	 * @param {number} index
	 * @returns {Promise<number[]>}
	 * @memberof Game
	 */
	async getUserIndexesExceptOneself(index: number): Promise<number[]> {
		const res: number[] = [];
		for (let i = 0; i < this.userIds.length; i++) {
			if (i != index) {
				res.push(i);
			}
		}
		return res;
	}

	/**
	 * targetIndexがonesIndex以外の範囲内インデックスであるかどうか
	 *
	 * @param {number} onesIndex
	 * @param {number} targetIndex
	 * @returns {Promise<boolean>}
	 * @memberof Game
	 */
	async existsUserIndexExceptOneself(onesIndex: number, targetIndex: number): Promise<boolean> {
		const indexes = await this.getUserIndexesExceptOneself(onesIndex);
		let res = false;
		for (const index of indexes) {
			if (targetIndex == index) {
				res = true;
				break;
			}
		}
		return res;
	}

	/**
	 * indexの参加者の表示名を取得
	 *
	 * @param {number} index
	 * @returns {Promise<string>}
	 * @memberof Game
	 */
	async getDisplayName(index: number): Promise<string> {
		const displayNames = await this.getDisplayNames();
		return displayNames[index];
	}

	/**
	 * インデックスの配列に対応した表示名の配列を返す
	 *
	 * @param {number[]} indexes
	 * @returns {Promise<string[]>}
	 * @memberof Game
	 */
	async getDisplayNamesFromIndexes(indexes: number[]): Promise<string[]> {
		const displayNames = await this.getDisplayNames();
		const res: string[] = [];
		for (const index of indexes) {
			res.push(displayNames[index]);
		}
		return res;
	}

	/**
	 * ゲームを始めるのに必要な最小の人数を返す
	 *
	 * @returns {Promise<number>}
	 * @memberof Game
	 */
	async getMinNumber(): Promise<number> {
		return games[this.gameName].minNumber;
	}

	/**
	 * 参加者追加
	 *
	 * @param {string} userId
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async appendUserId(userId: string): Promise<void> {
		const isUserExists = await this.isUserExists(userId);
		if (!isUserExists) {
			this.userIds.push(userId);
		}
		await this.update();
	}

	/**
	 * 与えられたuserIdが参加者リストに存在するか
	 *
	 * @param {string} userId
	 * @returns {Promise<boolean>}
	 * @memberof Game
	 */
	async isUserExists(userId: string): Promise<boolean> {
		const userIds: string[] = this.userIds;
		let res = false;
		for (const id of userIds) {
			if (userId == id) {
				res = true;
			}
		}
		return res;
	}

	/**
	 * 参加者のデータのgroup_idを空文字にする
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async deleteUsersGroupId(): Promise<void> {
		const userIds: string[] = this.userIds;
		for (const userId of userIds) {
			const user: User = await User.createInstance(userId);
			const userGroupId: string = user.groupId;
			if (userGroupId == this.groupId) {
				await user.deleteGroupId();
			}
		}
	}

	/**
	 * 参加者数を取得
	 *
	 * @returns {Promise<number>}
	 * @memberof Game
	 */
	async getUserNumber(): Promise<number> {
		return this.userIds.length;
	}

	/**
	 * 参加者数分の連続した整数の配列作る
	 * 例: 4人の場合 [0,1,2,3]
	 *
	 * @returns {Promise<number[]>}
	 * @memberof Game
	 */
	async getUserIndexes(): Promise<number[]> {
		const userNumber: number = await this.getUserNumber();
		const res: number[] = [];
		for (let i = 0; i < userNumber; i++) {
			res[i] = i;
		}
		return res;
	}

	/**
	 * 与えられたuserIdから参加者リストのインデックスを取得
	 *
	 * @param {string} userId
	 * @returns {Promise<Number>}
	 * @memberof Game
	 */
	async getUserIndexFromUserId(userId: string): Promise<number> {
		const userIds = this.userIds;
		let index = -1;
		for (let i = 0; i < userIds.length; i++) {
			if (userIds[i] == userId) {
				index = i;
			}
		}
		return index;
	}

	/**
	 * デフォルトの設定ステータスにする
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateDefaultSettingStatus(): Promise<void> {
		this.settingStatus = this.defaultSettingStatus;
		await this.update()
	}

	/**
	 * nameに一致する設定名のインデックスを取得
	 *
	 * @param {string} name
	 * @returns {Promise<number>}
	 * @memberof Game
	 */
	async getSettingIndex(name: string): Promise<number> {
		const settingNames: string[] = this.settingNames;
		let res = -1;
		for (let i = 0; i < settingNames.length; i++) {
			if (settingNames[i] == name) {
				res = i;
			}
		}
		return res;
	}

	/**
	 * 入力の設定名の設定ステータスをboolに更新
	 *
	 * @param {string} name
	 * @param {boolean} bool
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateSettingState(name: string, bool: boolean): Promise<void> {
		const settingIndex: number = await this.getSettingIndex(name);
		this.settingStatus[settingIndex] = bool;
		await this.update();
	}

	/**
	 * indexの設定ステータスをtrueに
	 *
	 * @param {number} index
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateSettingStateTrue(index: number): Promise<void> {
		this.settingStatus[index] = true;
		console.log(this.settingStatus);
		await this.update();
	}

	/**
	 * indexの設定ステータスをfalseに
	 *
	 * @param {number} index
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateSettingStateFalse(index: number): Promise<void> {
		this.settingStatus[index] = false;
		await this.update();
	}

	/**
	 * 設定が完了しているかどうかを返す
	 *
	 * @returns {Promise<boolean>}
	 * @memberof Game
	 */
	async isSettingCompleted(): Promise<boolean> {
		const settingStatus: boolean[] = this.settingStatus;
		let res = true;
		for (const settingState of settingStatus) {
			if (!settingState) {
				res = false;
			}
		}
		return res;
	}

	/**
	 * タイマー情報を"○時間✖︎分△秒の形で返す"
	 *
	 * @returns {Promise<string>}
	 * @memberof Game
	 */
	async getTimerString(): Promise<string> {
		const timer: string = this.timer;
		const timerArray: string[] = timer.split(":");
		let timerString = "";
		if (timerArray[0] != "00") {
			timerString += Number(timerArray[0]) + "時間";
		}
		if (timerArray[1] != "00") {
			timerString += Number(timerArray[1]) + "分";
		}
		if (timerArray[2] != "00") {
			timerString += Number(timerArray[2]) + "秒";
		}

		return timerString;
	}

	/**
	 * timer設定を更新
	 *
	 * @param {string} time
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateTimer(time: string): Promise<void> {
		this.timer = "00:" + time;
		await this.update();
	}

	/**
	 * ゲームのステータスを更新
	 *
	 * @param {string} status
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateGameStatus(status: string): Promise<void> {
		this.gameStatus = status;
		await this.update();
	}

	/**
	 * discussionデータ作成
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async putDiscussion(): Promise<void> {
		await Discussion.putDiscussion(this.gameId, this.day, this.groupId, this.timer);
	}

	/**
	 * discussionをセット
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async setDiscussion(): Promise<void> {
		this.discussion = await Discussion.createInstance(this.gameId, this.day, this.groupId);
	}

	/**
	 * 残り時間取得
	 *
	 * @returns {Promise<string>}
	 * @memberof Game
	 */
	async getRemainingTime(): Promise<string> {
		return await this.discussion.getRemainingTime();
	}

	/**
	 * 最初の投票のデータを挿入
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	// TODO: Voteクラスはなくなるからこのへんの仕様が変わる
	async putFirstVote(): Promise<void> {
		const indexes = await this.getUserIndexes();
		await Vote.putVote(this.gameId, this.day, 1, indexes, indexes.length);
	}

	/**
	 * 再投票データを挿入
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	// TODO: Voteクラスはなくなるからこのへんの仕様が変わる
	async putRevote(): Promise<void> {
		const indexes = await this.vote.getMostPolledUserIndexes();
		const count = this.vote.count + 1;
		const userNumber = await this.getUserNumber();
		await Vote.putVote(this.gameId, this.day, count, indexes, userNumber);
	}

	/**
	 * 投票データをセット
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async setVote(): Promise<void> {
		this.vote = await Vote.createInstance(this.gameId);
	}

	/**
	 * 勝者を更新
	 *
	 * @param {string} winner
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async updateWinner(winner: string): Promise<void> {
		this.winner = winner;
		await this.update();
	}

	/**
	 * 表示名が参加者に存在するかどうかを返す
	 *
	 * @param {string} name
	 * @returns {Promise<boolean>}
	 * @memberof Game
	 */
	async displayNameExists(name: string): Promise<boolean> {
		const displayNames: string[] = await this.getDisplayNames();
		let res = false;
		for (const displayName of displayNames) {
			if (displayName == name) {
				res = true;
				break;
			}
		}
		return res;
	}

	/**
	 * アクションデータをセット
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	async setAction(): Promise<void> {
		this.action = await Action.createInstance(this.gameId, this.day);
	}

	/**
	 * 0日目のアクションデータの初期値を挿入
	 *
	 * @returns {Promise<void>}
	 * @memberof Game
	 */
	// TODO: Actionクラスなくなるからここの仕様が変わるよ
	async putZeroAction(): Promise<void> {
		const userNumber: number = await this.getUserNumber();
		const status: boolean[] = Array(userNumber).fill(false);
		await Action.putAction(this.gameId, this.day, status);
	}

	/**
	 * positionNameに一致する役職のインデックスの配列を取得
	 *
	 * @param {string} positionName
	 * @returns {Promise<number[]>}
	 * @memberof Game
	 */
	async getPositionIndexes(positionName: string): Promise<number[]> {
		const res: number[] = [];
		for (let i = 0; i < this.positions.length; i++) {
			if (this.positions[i] == positionName) {
				res.push(i);
			}
		}
		return res;
	}

	/**
	 * 入力の役職のターゲットを配列で取得
	 *
	 * @param {string} positionName
	 * @returns {Promise<number[]>}
	 * @memberof Game
	 */
	async getTargetsOfPosition(positionName: string): Promise<number[]> {
		const indexes: number[] = await this.getPositionIndexes(positionName);
		const targets = [];
		for (const index of indexes) {
			targets.push(this.action.targets[index]);
		}
		return targets;
	}

	/**
	 * 入力の役職のターゲットを取得
	 *
	 * @param {string} positionName
	 * @returns {Promise<number>}
	 * @memberof Game
	 */
	async getTargetOfPosition(positionName: string): Promise<number> {
		const targets = await this.getTargetsOfPosition(positionName);
		return targets[0];
	}
}
