import * as aws from '../clients/awsClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const voteTable = process.env.voteTable;
const sequenceTable = process.env.sequenceTable;

/**
 * Voteクラス
 *
 * @export
 * @class Vote
 */
export class Vote {
	gameId: number;
	voteId: number;
	voteKey: DocumentClient.Key;
	day: number;
	count: number;
	candidateIndexes: number[];
	polledNumbers: number[];
	voteStatus: boolean[];

	/**
	 * Creates an instance of Vote.
	 *
	 * @param {number} gameId
	 * @memberof Vote
	 */
	constructor(gameId: number) {
		this.gameId = gameId;
		this.voteId = -1;
		this.voteKey = {
			game_id: this.gameId,
			vote_id: this.voteId,
		};

		this.day = -1;
		this.count = -1;
		this.candidateIndexes = [];
		this.polledNumbers = [];
		this.voteStatus = [];
	}

	/**
	 * 初期化
	 *
	 * @returns {Promise<void>}
	 * @memberof Vote
	 */
	async init(): Promise<void> {
		try {
			const data: DocumentClient.QueryOutput = await aws.dynamoQuery(voteTable, 'game_id', this.gameId, false);
			if (data.Count != undefined) {
				if (data.Count > 0) {
					if (data.Items != undefined) {
						const vote: DocumentClient.AttributeMap = data.Items[0];
						this.voteId = vote.vote_id as number;
						this.voteKey = {
							game_id: this.gameId,
							vote_id: this.voteId,
						};

						this.day = vote.day as number;
						this.count = vote.count as number;
						this.candidateIndexes = vote.candidate_indexes as number[];
						this.polledNumbers = vote.polled_numbers as number[];
						this.voteStatus = vote.vote_status as boolean[];
					}
				}
			}
		} catch (err) {
			console.error(err);
			console.error('Voteの初期化失敗');
		}
	}

	/**
	 * Voteインスタンス作成
	 *
	 * @static
	 * @param {number} gameId
	 * @returns {Promise<Vote>}
	 * @memberof Vote
	 */
	static async createInstance(gameId: number): Promise<Vote> {
		const vote: Vote = new Vote(gameId);
		await vote.init();
		return vote;
	}

	/**
	 * Voteデータ追加
	 *
	 * @static
	 * @param {number} gameId
	 * @param {number} day
	 * @param {number} count
	 * @param {number[]} candidateIndexes
	 * @param {number} userNumber
	 * @returns {Promise<void>}
	 * @memberof Vote
	 */
	static async putVote(
		gameId: number,
		day: number,
		count: number,
		candidateIndexes: number[],
		userNumber: number
	): Promise<void> {
		try {
			const key: { name: string } = { name: voteTable };
			const data: DocumentClient.GetItemOutput = await aws.dynamoGet(sequenceTable, key);
			let voteId = 0;
			if (data.Item != undefined) {
				voteId = data.Item.number + 1;
			}
			const polledNumbers: number[] = new Array(userNumber).fill(0);
			const voteStatus: boolean[] = new Array(userNumber).fill(false);
			const item: DocumentClient.AttributeMap = {
				game_id: gameId,
				vote_id: voteId,
				day: day,
				count: count,
				candidate_indexes: candidateIndexes,
				polled_numbers: polledNumbers,
				vote_status: voteStatus,
			};
			// voteデータをputできたらsequenceをプラス１
			aws.dynamoPut(voteTable, item).then(await aws.dynamoUpdate(sequenceTable, key, 'number', voteId));
		} catch (err) {
			console.log(err);
		}
	}

	/**
	 * userIndexが投票済みかどうかを
	 *
	 * @param {number} userIndex
	 * @returns {Promise<boolean>}
	 * @memberof Vote
	 */
	async isVotedUser(userIndex: number): Promise<boolean> {
		let res = false;
		if (this.voteStatus[userIndex]) {
			res = true;
		}
		return res;
	}

	/**
	 * userIndexが候補者かどうかを返す
	 *
	 * @param {number} userIndex
	 * @returns {Promise<boolean>}
	 * @memberof Vote
	 */
	async isUserCandidate(userIndex: number): Promise<boolean> {
		let res = false;
		for (const candidateIndex of this.candidateIndexes) {
			if (candidateIndex == userIndex) {
				res = true;
				break;
			}
		}
		return res;
	}

	/**
	 * userの投票ステータスを更新
	 *
	 * @param {number} userIndex
	 * @returns {Promise<void>}
	 * @memberof Vote
	 */
	async updateVoteState(userIndex: number): Promise<void> {
		this.voteStatus[userIndex] = true;
		aws.dynamoUpdate(voteTable, this.voteKey, 'vote_status', this.voteStatus);
	}

	/**
	 * ユーザーの得票数を更新
	 *
	 * @param {number} userIndex
	 * @returns {Promise<void>}
	 * @memberof Vote
	 */
	async updatePolledNumber(userIndex: number): Promise<void> {
		this.polledNumbers[userIndex] += 1;
		console.log(this.polledNumbers);
		aws.dynamoUpdate(voteTable, this.voteKey, 'polled_numbers', this.polledNumbers);
	}

	/**
	 * 投票に関する処理
	 *
	 * @param {number} voterIndex
	 * @param {number} polledIndex
	 * @returns {Promise<void>}
	 * @memberof Vote
	 */
	async vote(voterIndex: number, polledIndex: number): Promise<void> {
		this.updateVoteState(voterIndex);
		this.updatePolledNumber(polledIndex);
	}

	/**
	 * 投票が完了しているかどうか
	 *
	 * @returns {Promise<boolean>}
	 * @memberof Vote
	 */
	async isVoteCompleted(): Promise<boolean> {
		let res = true;
		for (const state of this.voteStatus) {
			if (!state) {
				res = false;
				break;
			}
		}
		return res;
	}

	/**
	 * 最大得票数のユーザーが複数いるかどうかを返す
	 *
	 * @returns {Promise<boolean>}
	 * @memberof Vote
	 */
	async multipleMostPolledUserExists(): Promise<boolean> {
		let res = false;
		let max = -1;
		for (const voteNumber of this.polledNumbers) {
			if (voteNumber > max) {
				max = voteNumber;
				res = false;
			} else if (voteNumber == max) {
				res = true;
			}
		}
		return res;
	}

	/**
	 * 得票数が最も多いユーザーのインデックスを取得
	 *
	 * @returns {Promise<number>}
	 * @memberof Vote
	 */
	async getMostPolledUserIndex(): Promise<number> {
		let res = -1;
		let max = -1;
		for (let i = 0; i < this.polledNumbers.length; i++) {
			if (this.polledNumbers[i] > max) {
				max = this.polledNumbers[i];
				res = i;
			}
		}
		return res;
	}

	/**
	 * 最大得票数を取得
	 *
	 * @returns {Promise<number>}
	 * @memberof Vote
	 */
	async getMostPolledNumber(): Promise<number> {
		return Math.max.apply(null, this.polledNumbers);
	}

	/**
	 * 得票数が最大のユーザーを配列で取得
	 *
	 * @returns
	 * @memberof Vote
	 */
	async getMostPolledUserIndexes(): Promise<number[]> {
		const mostPolledNumber: number = await this.getMostPolledNumber();
		const indexes = [];
		for (let i = 0; i < this.polledNumbers.length; i++) {
			if (this.polledNumbers[i] == mostPolledNumber) {
				indexes.push(i);
			}
		}
		return indexes;
	}

	/**
	 * 最大得票者の中からランダムで処刑者を選ぶ
	 *
	 * @returns
	 * @memberof Vote
	 */
	async chooseExecutorRandomly(): Promise<number> {
		const userIndexes = await this.getMostPolledUserIndexes();
		const index = Math.floor(Math.random() * userIndexes.length); // これは返さない
		return userIndexes[index];
	}
}
