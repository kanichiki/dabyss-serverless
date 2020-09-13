import * as aws from "../clients/awsClient";
import { Game } from "./Game";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const groupTable = process.env.groupTable;

/**
 * Groupクラス
 *
 * @export
 * @class Group
 */
export class Group {
	groupId: string;
	groupKey: DocumentClient.Key;
	exists: boolean;
	status: string;
	playingGame: string;
	isRestarting: boolean;
	isFinishing: boolean;

	/**
	 * Groupクラスのコンストラクタ
	 * @param {string} groupId
	 * @memberof Group
	 */
	constructor(groupId: string) {
		this.groupId = groupId;
		this.groupKey = {
			group_id: groupId,
		};
		this.exists = false;
		this.status = "";
		this.playingGame = "";
		this.isRestarting = false;
		this.isFinishing = false;
	}

	/**
	 * 初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async init(): Promise<void> {
		const data: DocumentClient.QueryOutput = await aws.dynamoQuery(groupTable, "group_id", this.groupId, false);
		if (data.Count != undefined) {
			if (data.Count > 0) {
				this.exists = true;
				if (data.Items != undefined) {
					const group: DocumentClient.AttributeMap = data.Items[0];
					this.status = group.status;
					this.playingGame = group.playing_game;
					this.isRestarting = group.is_restarting;
					this.isFinishing = group.is_finishing;
				}
			}
		}
	}

	/**
	 * Groupインスタンス作成
	 *
	 * @static
	 * @param {string} groupId
	 * @returns {Promise<Group>}
	 * @memberof Group
	 */
	static async createInstance(groupId: string): Promise<Group> {
		const group: Group = new Group(groupId);
		await group.init();
		return group;
	}

	/**
	 * groupを作成
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async putGroup(): Promise<void> {
		try {
			const item: DocumentClient.PutItemInputAttributeMap = {
				group_id: this.groupId,
				status: "recruit",
				is_restarting: false,
				is_finishing: false,
			};
			await aws.dynamoPut(groupTable, item);
		} catch (err) {
			console.log(err);
		}
	}

	/**
	 * Groupをリセット
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async resetGroup(): Promise<void> {
		const game: Game = await Game.createInstance(this.groupId);
		await game.deleteUsersGroupId();

		await this.updateStatus("recruit");
		await this.updateIsRestarting(false);
		await this.updateIsFinishing(false);
	}

	/**
	 * ステータスを更新
	 *
	 * @param {string} status
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async updateStatus(status: string): Promise<void> {
		this.status = status;
		await aws.dynamoUpdate(groupTable, this.groupKey, "status", this.status);
	}

	async updatePlayingGame(gameName: string): Promise<void> {
		this.playingGame = gameName;
		await aws.dynamoUpdate(groupTable, this.groupKey, "playing_game", this.playingGame);
	}

	/**
	 * リスタート状態をboolに
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async updateIsRestarting(bool: boolean): Promise<void> {
		this.isRestarting = bool;
		await aws.dynamoUpdate(groupTable, this.groupKey, "is_restarting", this.isRestarting);
	}

	/**
	 * 強制終了状態をtrueに
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async updateIsFinishing(bool: boolean): Promise<void> {
		this.isFinishing = bool;
		await aws.dynamoUpdate(groupTable, this.groupKey, "is_finishing", this.isFinishing);
	}

	/**
	 * 全部終わらせる
	 * 全部falseにする
	 * ただし、ユーザーに関してはまだ参加中が該当のgroupIdのときのみ
	 *
	 * @returns {Promise<void>}
	 * @memberof Group
	 */
	async finishGroup(): Promise<void> {
		await this.updateStatus("finish");
		await this.updateIsRestarting(false);
		await this.updateIsFinishing(false);

		const game: Game = await Game.createInstance(this.groupId);
		await game.deleteUsersGroupId();
	}
}
