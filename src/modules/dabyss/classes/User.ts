import * as aws from '../clients/awsClient';
import * as line from '../clients/lineClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const userTable = process.env.userTable;

/**
 * Userクラス
 *
 * @export
 * @class User
 */
export class User {
	userId: string;
	userKey: DocumentClient.Key;
	exists: boolean;
	groupId: string;
	isRestarting: boolean;

	/**
	 * Creates an instance of User.
	 *
	 * テーブル構造は以下の通り
	 * @param {string} userId : userId
	 * group_id : 参加中のgroup_id。ゲーム終了時に削除するようにする
	 * is_restarting : group_idがあるときに他のゲームに参加しようとしたら確認をするが、その保留ステータス
	 */
	constructor(userId: string) {
		this.userId = userId;
		this.userKey = {
			user_id: userId,
		};
		this.exists = false;
		this.groupId = '';
		this.isRestarting = false;
	}

	/**
	 * 初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof User
	 */
	async init(): Promise<void> {
		const data: DocumentClient.QueryOutput = await aws.dynamoQuery(userTable, 'user_id', this.userId, false);
		if (data.Count != undefined) {
			if (data.Count > 0) {
				this.exists = true;
				if (data.Items != undefined) {
					const user: DocumentClient.AttributeMap = data.Items[0];
					this.groupId = user.group_id;
					this.isRestarting = user.is_restarting;
				}
			}
		}
	}

	/**
	 * userインスタンスを作る
	 *
	 * @static
	 * @param {string} userId
	 * @returns {Promise<User>}
	 * @memberof User
	 */
	static async createInstance(userId: string): Promise<User> {
		const user: User = new User(userId);
		await user.init();
		return user;
	}

	/**
	 * group_idを持ってるかどうか
	 *
	 * @returns {Promise<boolean>}
	 * @memberof User
	 */
	async hasGroupId(): Promise<boolean> {
		let res = true;
		if (this.groupId == 'none' || this.groupId == undefined) {
			res = false;
		}
		return res;
	}

	/**
	 * ユーザーデータ挿入
	 *
	 * @param {string} groupId
	 * @returns {Promise<void>}
	 * @memberof User
	 */
	async putUser(groupId: string): Promise<void> {
		const item: DocumentClient.AttributeMap = {
			user_id: this.userId,
			group_id: groupId,
			is_restarting: false,
		};
		aws.dynamoPut(userTable, item);
	}

	/**
	 * groupIdを更新
	 *
	 * @param {string} groupId
	 * @returns {Promise<void>}
	 * @memberof User
	 */
	async updateGroupId(groupId: string): Promise<void> {
		this.groupId = groupId;
		await aws.dynamoUpdate(userTable, this.userKey, 'group_id', this.groupId);
	}

	/**
	 * group_idを削除する（"none"にする）
	 *
	 * @returns {Promise<void>}
	 * @memberof User
	 */
	async deleteGroupId(): Promise<void> {
		this.groupId = 'none';
		await aws.dynamoUpdate(userTable, this.userKey, 'group_id', this.groupId);
	}

	/**
	 * リスタート状態をtrueに
	 *
	 * @returns {Promise<void>}
	 * @memberof User
	 */
	async updateIsRestarting(bool: boolean): Promise<void> {
		this.isRestarting = bool;
		aws.dynamoUpdate(userTable, this.userKey, 'is_restarting', this.isRestarting);
	}

	/**
	 * 表示名を返す
	 *
	 * @returns {Promise<string>}
	 * @memberof User
	 */
	async getDisplayName(): Promise<string> {
		const profile = await line.getProfile(this.userId);
		return profile.displayName;
	}
}
