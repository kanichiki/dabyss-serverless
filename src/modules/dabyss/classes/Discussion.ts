import * as aws from "../clients/awsClient";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as commonFunction from "../utils/commonFunction";

const discussionTable = process.env.discussionTable;

/**
 * ディスカッションクラス
 * 話し合いに関するクラス
 *
 * @export
 * @class Discussion
 */
export class Discussion {
	gameId: number;
	day: number;
	discussionKey: DocumentClient.Key;
	groupId: string;
	timer: string;
	startTime: string;
	endTime: string;
	isDiscussing: string; // スパースインデックス(議論中の場合はここに"discussing"が入る)

	/**
	 * ディスカッションクラスのコンストラクタ
	 * @param {number} gameId
	 * @param {number} day
	 * @param {string} groupId
	 * @memberof Discussion
	 */
	constructor(gameId: number, day: number, groupId: string) {
		this.gameId = gameId;
		this.day = day;
		this.discussionKey = {
			game_id: this.gameId,
			day: this.day,
		};
		this.groupId = groupId;
		this.timer = "";
		this.startTime = "";
		this.endTime = "";
		this.isDiscussing = "";
	}

	/**
	 * 初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof Discussion
	 */
	async init(): Promise<void> {
		try {
			const data: DocumentClient.GetItemOutput = await aws.dynamoGet(discussionTable, this.discussionKey);
			if (data.Item != undefined) {
				const discussion: DocumentClient.AttributeMap = data.Item;
				this.timer = discussion.timer as string;
				this.startTime = discussion.start_time as string;
				this.endTime = discussion.end_time as string;
				this.isDiscussing = discussion.is_discussing as string;
			}
		} catch (err) {
			console.error(err);
			console.error("discussionの初期化失敗");
		}
	}

	/**
	 * ディスカッションクラスのインスタンス作成
	 *
	 * @static
	 * @param {number} gameId
	 * @param {number} day
	 * @param {string} groupId
	 * @returns {Promise<Discussion>}
	 * @memberof Discussion
	 */
	static async createInstance(gameId: number, day: number, groupId: string): Promise<Discussion> {
		const discussion: Discussion = new Discussion(gameId, day, groupId);
		await discussion.init();
		return discussion;
	}

	/**
	 * ディスカッションのデータ挿入
	 *
	 * @static
	 * @param {number} gameId
	 * @param {number} day
	 * @param {string} groupId
	 * @param {string} timer
	 * @returns {Promise<void>}
	 * @memberof Discussion
	 */
	static async putDiscussion(gameId: number, day: number, groupId: string, timer: string): Promise<void> {
		try {
			const startTime: string = await commonFunction.getCurrentTime();
			const endTime: string = await commonFunction.getEndTime(startTime, timer);
			const item: DocumentClient.AttributeMap = {
				game_id: gameId,
				day: day,
				group_id: groupId,
				timer: timer,
				start_time: startTime,
				end_time: endTime,
				is_discussing: "discussing",
			};

			await aws.dynamoPut(discussionTable, item);
		} catch (err) {
			console.log(err);
		}
	}

	/**
	 * 残り時間を「○分✖︎✖︎秒」の形で取得
	 *
	 * @returns {Promise<string>}
	 * @memberof Discussion
	 */
	async getRemainingTime(): Promise<string> {
		const remainingTime: commonFunction.Interval = await commonFunction.getRemainingTime(this.endTime);
		return await commonFunction.convertIntervalToTimerString(remainingTime);
	}

	/**
	 * 議論中ステータスをfalseに
	 *
	 * @returns {Promise<void>}
	 * @memberof Discussion
	 */
	async updateIsDiscussingFalse(): Promise<void> {
		this.isDiscussing = "none";
		await aws.dynamoUpdate(discussionTable, this.discussionKey, "is_discussing", this.isDiscussing);
	}
}
