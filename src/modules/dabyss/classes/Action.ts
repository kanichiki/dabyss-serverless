import * as aws from '../clients/awsClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const actionTable = process.env.actionTable;

/**
 * アクションのクラス
 *
 * @export
 * @class Action
 */
export class Action {
	gameId: number;
	day: number;
	actionKey: DocumentClient.Key;
	actionStatus: boolean[]; // 各プレイヤーがアクションしたかどうかの配列
	targets: number[]; // 各プレイヤーのターゲットの配列。ターゲットがいない場合やデフォルトは-1

	/**
	 * アクションクラスのコンストラクタ
	 *
	 * @param {number} gameId
	 * @param {number} day
	 * @memberof Action
	 */
	constructor(gameId: number, day: number) {
		this.gameId = gameId;
		this.day = day;
		this.actionKey = {
			game_id: this.gameId,
			day: this.day,
		};
		this.actionStatus = [];
		this.targets = [];
	}

	/**
	 * データで初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof Action
	 */
	async init(): Promise<void> {
		try {
			const data: DocumentClient.GetItemOutput = await aws.dynamoGet(actionTable, this.actionKey);
			if (data.Item != undefined) {
				const action: DocumentClient.AttributeMap = data.Item;
				this.actionStatus = action.action_status as boolean[];
				this.targets = action.targets as number[];
			}
		} catch (err) {
			console.error(err);
		}
	}

	/**
	 * アクションインスタンス作成
	 *
	 * @static
	 * @param {number} gameId
	 * @param {number} day
	 * @returns {Promise<Action>}
	 * @memberof Action
	 */
	static async createInstance(gameId: number, day: number): Promise<Action> {
		const action: Action = new Action(gameId, day);
		await action.init();
		return action;
	}

	/**
	 * アクションデータ挿入
	 *
	 * @static
	 * @param {number} gameId
	 * @param {number} day
	 * @param {boolean[]} defaultStatus
	 * @returns {Promise<void>}
	 * @memberof Action
	 */
	static async putAction(gameId: number, day: number, defaultStatus: boolean[]): Promise<void> {
		const targets = Array(defaultStatus.length).fill(-1);
		try {
			const item: DocumentClient.AttributeMap = {
				game_id: gameId,
				day: day,
				action_status: defaultStatus,
				targets: targets,
			};

			await aws.dynamoPut(actionTable, item);
		} catch (err) {
			console.log(err);
		}
	}

	/**
	 * ユーザーがアクション済みかどうか返す
	 *
	 * @param {number} index
	 * @returns {Promise<boolean>}
	 * @memberof Action
	 */
	async isActedUser(index: number): Promise<boolean> {
		return this.actionStatus[index];
	}

	/**
	 * アクションステータスをtrueに
	 *
	 * @param {number} index
	 * @returns {Promise<void>}
	 * @memberof Action
	 */
	async updateActionStateTrue(index: number): Promise<void> {
		this.actionStatus[index] = true;
		await aws.dynamoUpdate(actionTable, this.actionKey, 'action_status', this.actionStatus);
	}

	/**
	 * ターゲットを更新
	 *
	 * @param {number} index
	 * @param {number} target
	 * @returns {Promise<void>}
	 * @memberof Action
	 */
	async updateTarget(index: number, target: number): Promise<void> {
		this.targets[index] = target;
		await aws.dynamoUpdate(actionTable, this.actionKey, 'targets', this.targets);
	}

	/**
	 * アクションする
	 * アクションステータスをtrueにしてターゲットを更新する
	 *
	 * @param {number} userIndex
	 * @param {number} target
	 * @returns {Promise<void>}
	 * @memberof Action
	 */
	async act(userIndex: number, target: number): Promise<void> {
		if (this.actionStatus == undefined) {
			return;
		}
		await this.updateActionStateTrue(userIndex);
		await this.updateTarget(userIndex, target);
	}

	/**
	 * アクションが完了しているかどうかを返す
	 *
	 * @returns {Promise<boolean>}
	 * @memberof Action
	 */
	async isActionCompleted(): Promise<boolean> {
		let res = true;
		for (const state of this.actionStatus) {
			if (!state) {
				res = false;
				break;
			}
		}
		return res;
	}
}
