import * as aws from "../../dabyss/clients/awsClient";
import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const playerTable = process.env.gameTable;

/**
 * 
 * @export
 * @class JinroUser
 * @extends {User}
 * 
 */

export class JinroPlayer extends dabyss.User {
    playerId: number;
    playerKey: DocumentClient.Key;
    position: string;
    isAlive: boolean;

	/**
	 * Creates an instance of User.
	 *
	 * テーブル構造は以下の通り
	 * @param {string} userId : userId
	 * group_id : 参加中のgroup_id。ゲーム終了時に削除するようにする
	 * is_restarting : group_idがあるときに他のゲームに参加しようとしたら確認をするが、その保留ステータス
	 */

    constructor(userId: string) {
        super(userId);
        this.playerId = -1;
        this.position = "市民";
        this.isAlive = true;
    };

	/**
	 * 初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof JinroPlayer
	 */
    async init(): Promise<void> {
        const data: DocumentClient.QueryOutput = 
        await aws.dynamoQuery(playerTable, "player_id", this.playerId, false);
        if (data.Count != undefined) {
			if (data.Count > 0) {
				this.exists = true;
				if (data.Items != undefined) {
					const player: DocumentClient.AttributeMap = data.Items[0];
					this.groupId = player.group_id;
                    this.isRestarting = player.is_restarting;
                    this.playerId = player.player_id;
                    this.position = player.position;
                    this.isAlive = player.is_alive;
				}
			}
		}
    }
    /**
	 * playerデータ挿入
	 *
	 * @param {string} groupId
	 * @returns {Promise<void>}
	 * @memberof JinroPlayer
	 */
	async putPlayer(groupId: string): Promise<void> {
		const item: DocumentClient.AttributeMap = {
			player_id: this.playerId,
			group_id: groupId,
            position: this.position,
            is_alive: this.isAlive,
		};
		aws.dynamoPut(playerTable, item);
	}

    /**
	 * 役職を割り当てる
	 *
	 * @returns {Promise<void>}
	 * @memberof JinroPlayer
	 */
    async updatePosition(position: string): Promise<void> {
        this.position = position;
        aws.dynamoUpdate(playerTable, this.playerKey, "position", this.position);
    }

    /**
	 * 死ぬ
	 *
	 * @returns {Promise<void>}
	 * @memberof JinroPlayer
	 */
    async die(): Promise<void> {
        this.isAlive = false;
        aws.dynamoUpdate(playerTable, this.playerKey, "is_alive", this.isAlive);
    }




}

