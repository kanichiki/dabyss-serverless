import dabyss = require('../../dabyss');
import { Craziness } from "./Craziness";
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {Action} from "../../dabyss";

const gameTable = process.env.gameTable;

/**
 * みんな狂ってるッ！！
 *
 * @export
 * @class CrazyNoisy
 * @extends {Game}
 */
export class CrazyNoisy extends dabyss.Game {
    settingNames: string[];
    defaultSettingStatus: boolean[];

    positionNames: { [key: string]: string };

    gameMode: string;
    talkType: number;
    zeroDetective: boolean;
    zeroGuru: boolean;

    brainwashStatus: boolean[];
    crazinessIds: number[][];


    /**
     * CrazyNoisyインスタンス作成
     * 
     * @constructor
     * @extends Game
     * @param {string} groupId
     * @memberof CrazyNoisy
     */
    constructor(groupId: string) {
        super(groupId);
        this.settingNames = ["mode", "type", "timer"];
        this.defaultSettingStatus = [false, false, true];

        this.positionNames = {
            guru: "教祖",
            fanatic: "狂信者",
            detective: "探偵",
            citizen: "市民",
            sp: "用心棒"
        }

        this.gameMode = "";
        this.talkType = -1;
        this.zeroDetective = false;
        this.zeroGuru = false;

        this.brainwashStatus = [];
        this.crazinessIds = [];
    }


    /**
     * 初期化
     *
     * @returns {Promise<void>}
     * @memberof CrazyNoisy
     */
    async init(): Promise<void> {
        try {
            const data: DocumentClient.QueryOutput = await dabyss.dynamoQuery(gameTable, "group_id", this.groupId, false);
            if (data.Count != undefined) {
                if (data.Count > 0) {
                    this.exists = true;
                    if (data.Items != undefined) {
                        const game: DocumentClient.AttributeMap = data.Items[0];

                        this.gameId = game.game_id as number;
                        this.gameKey = {
                            group_id: this.groupId,
                            game_id: this.gameId
                        }

                        this.userIds = game.user_ids as string[];
                        this.day = game.day as number;
                        this.gameName = game.game_name as string;
                        this.gameStatus = game.game_status as string;
                        this.settingStatus = game.setting_status as boolean[];
                        this.timer = game.timer as string;

                        this.gameMode = game.game_mode as string;
                        this.talkType = game.talk_type as number;
                        this.zeroDetective = game.zero_detective as boolean;
                        this.zeroGuru = game.zero_guru as boolean;

                        if (game.positions) {
                            this.positions = game.positions as string[];
                        }
                        if (game.brainwash_status) {
                            this.brainwashStatus = game.brainwash_status as boolean[];
                        }
                        if (game.craziness_ids) {
                            this.crazinessIds = game.craziness_ids as number[][];
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            console.error("gameの初期化失敗");
        }
    }


    /**
     * インスタンス作成
     *
     * @static
     * @param {string} groupId
     * @returns {Promise<CrazyNoisy>}
     * @memberof CrazyNoisy
     */
    static async createInstance(groupId: string): Promise<CrazyNoisy> {
        const crazyNoisy: CrazyNoisy = new CrazyNoisy(groupId);
        await crazyNoisy.init();
        return crazyNoisy;
    }

    async chooseFanaticNumber(): Promise<number> {
        const userNumber: number = await this.getUserNumber();
        const number: number = Math.floor((userNumber - 1) / 3);
        const fanaticNumber: number = await dabyss.getRandomNumber(number - 1, number);
        return fanaticNumber;
    }

    async chooseDetectiveNumber(): Promise<number> {
        const userNumber: number = await this.getUserNumber();
        const number: number = Math.floor((userNumber - 1) / 3);
        let detectiveNumber: number = await dabyss.getRandomNumber(number - 1, number);
        if (detectiveNumber > 1) {
            detectiveNumber = 1;
        }
        return detectiveNumber;
    }

    async chooseSpNumber(): Promise<number> {
        const userNumber: number = await this.getUserNumber();
        let spNumber: number = 0;
        if (userNumber > 6) {
            spNumber = 1
        }
        return spNumber;
    }

    async updatePositions() {
        const userNumber: number = await this.getUserNumber();
        const guruNumber: number = 1;
        const fanaticNumber: number = await this.chooseFanaticNumber();
        // const fanaticNumber = 1;
        const detectiveNumber: number = await this.chooseDetectiveNumber();
        // const detectiveNumber = 1;
        const spNumber: number = await this.chooseSpNumber();
        let isDecided: boolean[] = [];

        for (let i = 0; i < userNumber; i++) {
            isDecided[i] = false;
        }

        const positionNumbers: { [key: string]: number } = {
            guru: guruNumber,
            fanatic: fanaticNumber,
            detective: detectiveNumber,
            sp: spNumber
        }

        for (let k in positionNumbers) {
            let undecided: number[] = [];
            for (let i = 0; i < userNumber; i++) {
                if (!isDecided[i]) { // まだ決まってなかったら
                    undecided.push(i);
                }
            }

            const indexes: number[] = await dabyss.getRandomIndexes(undecided, positionNumbers[k]);
            for (let index of indexes) {
                this.positions[index] = this.positionNames[k];
                isDecided[index] = true;
            }
        }

        for (let i = 0; i < userNumber; i++) {
            if (!isDecided[i]) { // まだ決まってなかったら
                this.positions[i] = this.positionNames.citizen;
            }
        }

        dabyss.dynamoUpdate(gameTable, this.gameKey, "positions", this.positions);

    }

    async getPosition(userIndex: number): Promise<string> {
        const position = this.positions[userIndex];
        return position;
    }

    async updateGameMode(mode: string): Promise<void> {
        this.gameMode = mode;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "game_mode", this.gameMode);
    }

    async updateTalkType(type: number): Promise<void> {
        this.talkType = type;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "talk_type", this.talkType);
    }

    async switchZeroGuru(): Promise<void> {
        this.zeroGuru = !(this.zeroGuru);
        dabyss.dynamoUpdate(gameTable, this.gameKey, "zero_guru", this.zeroGuru);
    }

    async switchZeroDetective(): Promise<void> {
        this.zeroDetective = !(this.zeroDetective);
        dabyss.dynamoUpdate(gameTable, this.gameKey, "zero_detective", this.zeroDetective);
    }

    async updateDefaultBrainwashStatus(): Promise<void> {
        const positions: string[] = this.positions;
        for (let i = 0; i < positions.length; i++) {
            if (positions[i] == this.positionNames.guru || positions[i] == this.positionNames.fanatic) {
                this.brainwashStatus[i] = true;
            } else {
                this.brainwashStatus[i] = false;
            }
        }
        dabyss.dynamoUpdate(gameTable, this.gameKey, "brainwash_status", this.brainwashStatus);
    }

    async isBrainwash(index: number): Promise<boolean> {
        return this.brainwashStatus[index];
    }

    async getNotBrainwashedNumber() {
        let res = 0;
        for (let state of this.brainwashStatus) {
            if (!state) {
                res++;
            }
        }
        return res;
    }

    async isBrainwashCompleted(): Promise<boolean> {
        const notBrainwashed: number = await this.getNotBrainwashedNumber();
        const res: boolean = (notBrainwashed <= 1);
        return res;
    }

    async updateBrainwashStateTrue(index: number): Promise<void> {
        this.brainwashStatus[index] = true;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "brainwash_status", this.brainwashStatus);
    }


    async chooseCrazinessId(type: number): Promise<number> {
        const crazinessIds = await Craziness.getCrazinessIdsMatchType(type);
        const index: number = Math.floor(Math.random() * crazinessIds.length);
        return crazinessIds[index];
    }

    async updateDefaultCrazinessIds(): Promise<void> {
        const userNumber = await this.getUserNumber();
        for (let i = 0; i < userNumber; i++) {
            this.crazinessIds[i] = [];
            if (this.positions[i] == this.positionNames.fanatic) {
                const crazinessId = await this.chooseCrazinessId(this.talkType);
                this.crazinessIds[i].push(crazinessId);
            }
        }
        dabyss.dynamoUpdate(gameTable, this.gameKey, "craziness_ids", this.crazinessIds);
    }

    async updateDefaultCrazinessIdsInDemo(): Promise<void> {
        const userNumber = await this.getUserNumber();
        for (let i = 0; i < userNumber; i++) {
            this.crazinessIds[i] = [];

            const crazinessId = await this.chooseCrazinessId(this.talkType);
            this.crazinessIds[i].push(crazinessId);
        }
        dabyss.dynamoUpdate(gameTable, this.gameKey, "craziness_ids", this.crazinessIds);
    }

    async addCrazinessId(index: number): Promise<void> {
        let status: boolean = false;

        LOOP: while (!status) {
            const crazinessId: number = await this.chooseCrazinessId(this.talkType);
            for (let j = 0; j < this.crazinessIds[index].length; j++) {
                if (this.crazinessIds[index][j] == crazinessId) {
                    continue LOOP;
                }
            }
            this.crazinessIds[index].push(crazinessId);
            status = true;
        }

        dabyss.dynamoUpdate(gameTable, this.gameKey, "craziness_ids", this.crazinessIds);
    }

    async isGuru(index: number): Promise<boolean> {
        const res: boolean = (this.positions[index] == this.positionNames.guru);
        return res;
    }

    async getWinnerIndexes() {
        let res: number[] = [];
        for (let i = 0; i < this.positions.length; i++) {
            if (this.winner == "guru") { // 教団陣営勝利なら
                if (this.positions[i] == this.positionNames.guru || this.positions[i] == this.positionNames.fanatic) {
                    res.push(i);
                }
            } else { // 市民陣営勝利なら
                if ((this.positions[i] == this.positionNames.detective || this.positions[i] == this.positionNames.citizen) || this.positions[i] == this.positionNames.sp) {
                    res.push(i);
                }
            }

        }
        return res;
    }

    async putAction(){
        const userNumber: number = await this.getUserNumber();
        const status: boolean[] = [];
        for (let i = 0; i < userNumber; i++) {
            if (this.positions[i] == this.positionNames.guru || (this.positions[i] == this.positionNames.detective && !this.brainwashStatus[i])) {
                status[i] = false;
            } else {
                status[i] = true;
            }
        }
        await Action.putAction(this.gameId, this.day, status);
    }

}