import dabyss = require('../../dabyss');
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { werewolf } from '../constants/JinroParts';
import {Action} from "../../dabyss";

const gameTable = process.env.gameTable;

export interface PositionNumbers {
    werewolf: number;
    madman: number;
    forecaster: number;
    psychic: number;
    hunter: number;
    citizen: number;
}

export interface PositionNames {
    werewolf: string;
    madman: string;
    forecaster: string;
    psychic: string;
    hunter: string;
    citizen: string;
}

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

    positionNames: PositionNames;

    talkType: number;
    isAliveStatus: boolean[];

    positionNumbers: PositionNumbers;

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
        this.defaultSettingStatus = [true, true];

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

        this.positionNumbers = {
            werewolf: 0,
            madman: 0,
            forecaster: 0,
            psychic: 0,
            hunter: 0,
            citizen: 0,
        }
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
                        };
                        this.userIds = game.user_ids as string[];
                        this.day = game.day as number;
                        this.gameName = game.game_name as string;
                        this.gameStatus = game.game_status as string;
                        this.settingStatus = game.setting_status as boolean[];
                        this.timer = game.timer as string;
                        this.winner = game.winner as string;

                        this.talkType = game.talk_type as number;

                        if (game.positions) {
                            this.positions = game.positions as string[];
                        }
                        if (game.is_alive_status) {
                            this.isAliveStatus = game.is_alive_status as boolean[];
                        }
                        if (game.position_numbers) {
                            this.positionNumbers = game.position_numbers as PositionNumbers;
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

    async updatePositionNumbers(): Promise<void> {
        const userNumber: number = await this.getUserNumber();
        if (userNumber < 5) {
            this.positionNumbers.werewolf = 1;
        } else if (userNumber == 5) {
            this.positionNumbers.werewolf = 1;
            this.positionNumbers.madman = 1;
        } else if (userNumber == 6) {
            this.positionNumbers.werewolf = 1;
            this.positionNumbers.madman = 1;
            this.positionNumbers.forecaster = 1;
        } else if (userNumber == 7) {
            this.positionNumbers.werewolf = 2;
            this.positionNumbers.madman = 1;
            this.positionNumbers.forecaster = 1;
            this.positionNumbers.hunter = 1;
        } else if (userNumber >= 8 && userNumber < 11) {
            this.positionNumbers.werewolf = 2;
            this.positionNumbers.madman = 1;
            this.positionNumbers.forecaster = 1;
            this.positionNumbers.psychic = 1;
            this.positionNumbers.hunter = 1;
        } else if (userNumber >= 11 && userNumber < 15) {
            this.positionNumbers.werewolf = 3;
            this.positionNumbers.madman = 1;
            this.positionNumbers.forecaster = 1;
            this.positionNumbers.psychic = 1;
            this.positionNumbers.hunter = 1;
        } else {
            this.positionNumbers.werewolf = 4;
            this.positionNumbers.madman = 1;
            this.positionNumbers.forecaster = 1;
            this.positionNumbers.psychic = 1;
            this.positionNumbers.hunter = 1;
        }
        this.positionNumbers.citizen = userNumber - (this.positionNumbers.werewolf
            + this.positionNumbers.madman
            + this.positionNumbers.forecaster
            + this.positionNumbers.psychic
            + this.positionNumbers.hunter)

        dabyss.dynamoUpdate(gameTable, this.gameKey, "position_numbers", this.positionNumbers);
    }

    async updatePositions() {
        await this.updatePositionNumbers();
        let positions: string[] = [];

        for (let i = 0; i < this.positionNumbers.werewolf; i++) {
            positions.push("人狼")
        }
        for (let i = 0; i < this.positionNumbers.madman; i++) {
            positions.push("狂人")
        }
        for (let i = 0; i < this.positionNumbers.forecaster; i++) {
            positions.push("占い師")
        }
        for (let i = 0; i < this.positionNumbers.psychic; i++) {
            positions.push("霊媒師")
        }
        for (let i = 0; i < this.positionNumbers.hunter; i++) {
            positions.push("狩人")
        }
        for (let i = 0; i < this.positionNumbers.citizen; i++) {
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
        for (let i = 0; i < this.userIds.length; i++) {
            this.isAliveStatus[i] = true;
            console.log(this.isAliveStatus)
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

    async getWinnerIndexes(): Promise<number[]> {
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

    async getAliveNumber(): Promise<number> {
        let aliveNum = 0;
        for (let state of this.isAliveStatus) {
            if (state) {
                aliveNum++;
            }
        }
        return aliveNum;
    }

    async getAliveWerewolfNumber(): Promise<number> {
        let aliveNum = 0;
        for (let i = 0; i < this.userIds.length; i++) {
            if (this.positions[i] == this.positionNames.werewolf) {
                if (this.isAliveStatus[i]) {
                    aliveNum++;
                }
            }
        }
        return aliveNum
    }

    async getAliveNotWerewolfNumber(): Promise<number> {
        const aliveNumber = await this.getAliveNumber();
        const aliveWerewolfNumber = await this.getAliveWerewolfNumber();
        return aliveNumber - aliveWerewolfNumber
    }

    // TODO -> DONE 人狼側の勝利条件が満たされているか判定
    async isWerewolfWin(): Promise<boolean> {
        const aliveNumber: number = await this.getAliveNumber();
        const werewolfNumber: number = this.positionNumbers.werewolf;
        const isWerewolfWin: boolean = (aliveNumber - werewolfNumber <= werewolfNumber);
        return isWerewolfWin
    }

    async isCitizenWin(): Promise<boolean> {
        const aliveWerewolfNumber = await this.getAliveWerewolfNumber();
        return (aliveWerewolfNumber == 0)
    }


    async getDeadIndexes(): Promise<number[]> {
        const deadIndexes: number[] = [];
        for (let i = 0; i < this.userIds.length; i++) {
            if (!this.isAliveStatus[i]) {
                deadIndexes.push(i);
            }
        }
        return deadIndexes;
    }

    async putAction(){
        const userNumber: number = await this.getUserNumber();
        const status: boolean[] = [];
        for (let i = 0; i < userNumber; i++) {
            if (this.positions[i]==this.positionNames.madman || this.positions[i]==this.positionNames.citizen || !this.isAliveStatus[i]) {
                status[i] = true;
            } else {
                status[i] = false;
            }
        }
        await Action.putAction(this.gameId, this.day, status);
    }

    async getAliveUserIndexesExceptOneself(index: number): Promise<number[]> {
        let res: number[] = [];
        for (let i = 0; i < this.userIds.length; i++) {
            if (i != index　&& this.isAlive(i)) {
                res.push(i);
            }
        }
        return res;
    }

    async getAliveDisplayNamesExceptOneself(index: number): Promise<string[]> {
        let res: string[] = [];
        for (let i = 0; i < this.userIds.length; i++) {
            if (i != index　&& await this.isAlive(i)) {
                const user: dabyss.User = new dabyss.User(this.userIds[i]);
                const displayName: string = await user.getDisplayName();
                res.push(displayName);
            }
        }
        return res;
    }

    async getDeadDisplayNamesExceptOneself(index: number): Promise<string[]> {
        let res: string[] = [];
        for (let i = 0; i < this.userIds.length; i++) {
            if (i != index　&& ! await this.isAlive(i)) {
                const user: dabyss.User = new dabyss.User(this.userIds[i]);
                const displayName: string = await user.getDisplayName();
                res.push(displayName);
            }
        }
        return res;
    }


}