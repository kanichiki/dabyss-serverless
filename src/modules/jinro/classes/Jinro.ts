import dabyss = require('../../dabyss');
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const gameTable = process.env.gameTable;

/**
 * (「・ω・)「 がおー
 *
 * @export
 * @class Jinro
 * @extends {Game}
 */
export class Jinro extends dabyss.Game {
    settingNames: string[];
    defaultSettingStatus: boolean[];

    positionNames: { [key: string]: string };

    talkType: number;
    isAliveStatus: boolean[];

    /**
     * Jinroインスタンス作成
     * 
     * @constructor
     * @extends Game
     * @param {string} groupId
     * @memberof Jinro
     */
    constructor(groupId: string) {
        super(groupId);
        this.settingNames = ["type", "timer"];
        this.defaultSettingStatus = [false, true];

        this.positionNames = {
            werewolf: "人狼",
            madman: "狂人",
            forecaster: "占い師",
            psychic: "霊媒師",
            hunter: "狩人",
            citizen: "市民",
        }

        this.talkType = -1;
        this.isAliveStatus = [];
    }


    /**
     * 初期化
     *
     * @returns {Promise<void>}
     * @memberof Jinro
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

                        this.talkType = game.talk_type as number;

                        if (game.positions) {
                            this.positions = game.positions as string[];
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
     * @returns {Promise<Jinro>}
     * @memberof Jinro
     */
    static async createInstance(groupId: string): Promise<Jinro> {
        const jinro: Jinro = new Jinro(groupId);
        await jinro.init();
        return jinro;
    }

    async makePositionsNumberList(): Promise<number[]> {
        const userNumer: number = await this.getUserNumber();
        let position_num_list: number[] = []
        // [人狼, 狂人, 占い, 霊媒師, 狩人] 
        if (userNumer < 5) {
            position_num_list = [1, 0, 0, 0, 0];
        } else if (userNumer == 5) {
            position_num_list = [1, 1, 0, 0, 0];
        } else if (userNumer == 6) {
            position_num_list = [1, 1, 1, 0, 0];
        } else if (userNumer == 7) {
            position_num_list = [2, 1, 1, 0, 1];
        } else if (userNumer >= 8 && userNumer < 11) {
            position_num_list = [2, 1, 1, 1, 1];
        } else if (userNumer >= 11 && userNumer < 15) {
            position_num_list = [3, 1, 1, 1, 1];
        } else {
            position_num_list = [4, 1, 1, 1, 1];
        }
        return position_num_list;
    }

    async updatePositions() {
        const userNumber = await this.getUserNumber();
        const position_num_list = await this.makePositionsNumberList();
        const werewolfNumber: number = position_num_list[0];
        const madmanNumber: number = position_num_list[1];
        const forecasterNumber: number = position_num_list[2];
        const psychicNumber: number = position_num_list[3];
        const hunterNumber: number = position_num_list[4];
        const citizenNumber: number = userNumber - (werewolfNumber + madmanNumber + forecasterNumber + psychicNumber + hunterNumber);
        let positions: string[] = [];

        for (let i = 0; i < werewolfNumber; i++) {
            positions.push("人狼")
        }
        for (let i = 0; i < madmanNumber; i++) {
            positions.push("狂人")
        }
        for (let i = 0; i < forecasterNumber; i++) {
            positions.push("占い師")
        }
        for (let i = 0; i < psychicNumber; i++) {
            positions.push("霊媒師")
        }
        for (let i = 0; i < hunterNumber; i++) {
            positions.push("狩人")
        }
        for (let i = 0; i < citizenNumber; i++) {
            positions.push("市民")
        }

        // ランダム並べ替え
        for (let i = positions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = positions[i];
            positions[i] = positions[j];
            positions[j] = tmp;
        }

        this.positions = positions

        dabyss.dynamoUpdate(gameTable, this.gameKey, "positions", this.positions);
    }

    async getPosition(userIndex: number): Promise<string> {
        const position = this.positions[userIndex];
        return position;
    }

    async updateTalkType(type: number): Promise<void> {
        this.talkType = type;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "talk_type", this.talkType);
    }

    async updateDefaultAliveStatus(): Promise<void> {
        const positions: string[] = this.positions;
        for (let i = 0; i < positions.length; i++) {
            this.isAliveStatus[i] = true;
        }
        dabyss.dynamoUpdate(gameTable, this.gameKey, "is_alive_status", this.isAliveStatus);
    }

    async isAlive(index: number): Promise<boolean> {
        return this.isAliveStatus[index];
    }

    async die(index: number): Promise<void> {
        this.isAliveStatus[index] = false;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "is_alive_status", this.isAliveStatus);
    }

    async isWerewolf(index: number): Promise<boolean> {
        const res: boolean = (this.positions[index] == this.positionNames.werewolf);
        return res;
    }

    async getWinnerIndexes() {
        let res: number[] = [];
        for (let i = 0; i < this.positions.length; i++) {
            if (this.winner == "werewolf") { // 人狼陣営勝利なら
                if (this.positions[i] == this.positionNames.werewolf || this.positions[i] == this.positionNames.madman) {
                    res.push(i);
                }
            } else { // 市民陣営勝利なら
                if (this.positions[i] == this.positionNames.forecaster || this.positions[i] == this.positionNames.psychic || this.positionNames.hunter) {
                    res.push(i);
                }
            }

        }
        return res;
    }

    async getAliveNumber() {
        let alive_num = 0;
        for (let state of this.isAliveStatus) {
            if (state) {
                alive_num++;
            }
        }
        return alive_num;
    }

    // TODO -> DONE 人狼側の勝利条件が満たされているか判定
    async isWerewolfWin(): Promise<boolean> {
        const isAliveNumber: number = await this.getAliveNumber();
        const WerewolfNumber: number = await this.makePositionsNumberList()[0]
        const is_werewolf_win: boolean = (isAliveNumber <= WerewolfNumber);
        return is_werewolf_win
    }

}