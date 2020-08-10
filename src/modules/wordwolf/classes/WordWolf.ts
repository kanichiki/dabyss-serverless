import dabyss = require('../../dabyss');
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const gameTable: string = process.env.gameTable;

/**
 * みんな大好きワードウルフ！
 *
 * @export
 * @class WordWolf
 * @extends {Game}
 */
export class WordWolf extends dabyss.Game {
    wordSetTable: string;
    settingNames: string[];
    defaultSettingStatus: boolean[];
    wordSetId: number;
    depth: number;
    citizenWord: string;
    wolfWord: string;
    wolfIndexes: number[];
    lunaticIndexes: number[];

    /**
     * WordWolfインスタンス作成
     * 
     * @constructor
     * @extends Game
     * @param {string} groupId
     * @memberof WordWolf
     */
    constructor(groupId: string) {
        super(groupId);
        this.wordSetTable = "dabyss-dev-word-set";
        this.settingNames = ["depth", "wolf_number", "lunatic_number", "timer"];
        this.defaultSettingStatus = [false, false, false, true];
        this.wordSetId = -1;
        this.depth = -1;
        this.citizenWord = "";
        this.wolfWord = "";
        this.wolfIndexes = [];
        this.lunaticIndexes = [];
    }


    /**
     * 初期化
     *
     * @returns {Promise<void>}
     * @memberof WordWolf
     */
    async init(): Promise<void> {
        try {
            const data: DocumentClient.QueryOutput = await dabyss.dynamoQuery(gameTable, "group_id", this.groupId, false);
            if (data.Count != undefined) {
                if (data.Count > 0) {
                    this.exists = true;
                    if (data.Items != undefined) {
                        const game: DocumentClient.AttributeMap = data.Items[0];

                        this.gameId = game.game_id;
                        this.gameKey = {
                            group_id: this.groupId,
                            game_id: this.gameId
                        }
                        this.userIds = game.user_ids;
                        this.day = game.day;
                        this.gameName = game.game_name;
                        this.gameStatus = game.game_status;
                        this.settingStatus = game.setting_status;
                        this.timer = game.timer;

                        this.wordSetId = game.word_set_id;
                        this.depth = game.depth;
                        this.citizenWord = game.citizen_word;
                        this.wolfWord = game.wolf_word;
                        this.wolfIndexes = game.wolf_indexes;
                        this.lunaticIndexes = game.lunatic_indexes;
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
     * @returns {Promise<WordWolf>}
     * @memberof WordWolf
     */
    static async createInstance(groupId: string): Promise<WordWolf> {
        const wordWolf: WordWolf = new WordWolf(groupId);
        await wordWolf.init();
        return wordWolf;
    }

    /**
     * depthに一致するワードセットのidの配列を返す
     *
     * @param {number} depth
     * @returns {Promise<number[]>}
     * @memberof WordWolf
     */
    async getWordSetIdsMatchDepth(depth: number): Promise<number[]> {

        const index: string = "depth-word_set_id-index"
        let wordSetIds: number[] = [];
        if (depth != 3) {
            const data: DocumentClient.QueryOutput = await dabyss.dynamoQuerySecondaryIndex(this.wordSetTable, index, "depth", Number(depth));
            if (data.Items != undefined) {
                for (let item of data.Items) {
                    wordSetIds.push(item.word_set_id);
                }
            }
        } else {
            const data3: DocumentClient.QueryOutput = await dabyss.dynamoQuerySecondaryIndex(this.wordSetTable, index, "depth", 3);
            if (data3.Items != undefined) {
                for (let item of data3.Items) {
                    wordSetIds.push(item.word_set_id);
                }
            }
            const data4: DocumentClient.QueryOutput = await dabyss.dynamoQuerySecondaryIndex(this.wordSetTable, index, "depth", 4);
            if (data4.Items != undefined) {
                for (let item of data4.Items) {
                    wordSetIds.push(item.word_set_id);
                }
            }
        }
        return wordSetIds;

    }

    /**
     * depthに一致するワードセットをランダムに1つ選ぶ
     *
     * @param {number} depth
     * @returns {Promise<number>}
     * @memberof WordWolf
     */
    async chooseWordSetIdMatchDepth(depth: number): Promise<number> {
        const wordSetIds: number[] = await this.getWordSetIdsMatchDepth(depth);
        const index: number = Math.floor(Math.random() * wordSetIds.length);
        return wordSetIds[index];
    }

    /**
     * ワードセットの情報取得
     *
     * @returns {Promise<number>}
     * @memberof WordWolf
     */
    async getWordSet(): Promise<DocumentClient.AttributeMap> {
        const key = {
            word_set_id: this.wordSetId
        }
        const data: DocumentClient.GetItemOutput = await dabyss.dynamoGet(this.wordSetTable, key);
        if (data.Item == undefined) {
            data.Item = { "word_set_id": null };
        }
        return data.Item;
    }


    /**
     * depthに一致するワードセットを選んでgameデータにいれる
     *
     * @param {number} depth
     * @returns {Promise<void>}
     * @memberof WordWolf
     */
    async updateWordSet(depth: number): Promise<void> {
        try {
            this.depth = depth;
            dabyss.dynamoUpdate(gameTable, this.gameKey, "depth", this.depth);
            const wordSetId: number = await this.chooseWordSetIdMatchDepth(depth);
            this.wordSetId = wordSetId;
            dabyss.dynamoUpdate(gameTable, this.gameKey, "word_set_id", this.wordSetId);
            const isReverse: boolean = await dabyss.getRandomBoolean();
            const wordSet: DocumentClient.AttributeMap = await this.getWordSet();
            if (isReverse) {
                this.citizenWord = wordSet.word1;
                this.wolfWord = wordSet.word2;
            } else {
                this.citizenWord = wordSet.word2;
                this.wolfWord = wordSet.word1;
            }
            dabyss.dynamoUpdate(gameTable, this.gameKey, "citizen_word", this.citizenWord);
            dabyss.dynamoUpdate(gameTable, this.gameKey, "wolf_word", this.wolfWord);
        } catch (err) {
            console.log(err);
        }
    }


    /**
     * ウルフのインデックスを選択する
     *
     * @param {number} wolfNumber
     * @returns {Promise<number[]>}
     * @memberof WordWolf
     */
    async chooseWolfIndexes(wolfNumber: number): Promise<number[]> {
        const userNumber: number = await this.getUserNumber();

        const wolfIndexes: number[] = await dabyss.chooseRandomIndexes(userNumber, wolfNumber);
        return wolfIndexes;
    }

    /**
     * ウルフのインデックスを更新する
     *
     * @param {number} wolfNumber
     * @returns {Promise<void>}
     * @memberof WordWolf
     */
    async updateWolfIndexes(wolfNumber: number): Promise<void> {
        const wolfIndexes: number[] = await this.chooseWolfIndexes(wolfNumber);
        this.wolfIndexes = wolfIndexes;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "wolf_indexes", this.wolfIndexes);
    }

    // ウルフの数についての関数


    /**
     * ウルフの数の選択肢を返す
     * 参加者数の半数未満
     *
     * @returns {Promise<number[]>}
     * @memberof WordWolf
     */
    async getWolfNumberOptions(): Promise<number[]> {
        const userNumber: number = await this.getUserNumber();
        const maxWolfNumber: number = await dabyss.calculateMaxNumberLessThanHalf(userNumber);

        let res: number[] = [];
        for (let i = 1; i <= maxWolfNumber; i++) {
            res.push(i);
        }
        if (userNumber == 2) {
            res.push(1);
        }
        return res;
    }

    /**
     * ウルフの数の選択肢に"人"をつけたものを返す
     *
     * @returns {Promise<string[]>}
     * @memberof WordWolf
     */
    async getWolfNumberNinOptions(): Promise<string[]> {
        const wolfNumberOptions: number[] = await this.getWolfNumberOptions();
        let wolfNumberNinOptions: string[] = [];
        for (let i = 0; i < wolfNumberOptions.length; i++) {
            wolfNumberNinOptions[i] = wolfNumberOptions[i] + "人";
        }
        return wolfNumberNinOptions;
    }


    /**
     * 与えられたテキストがウルフの人数の選択肢の中にあるかどうかを返す
     * 例: text = "1人" → true, text = "1" → false
     *
     * @param {string} text
     * @returns {Promise<boolean>}
     * @memberof WordWolf
     */
    async wolfNumberExists(text: string): Promise<boolean> {
        const wolfNumberNinOptions: string[] = await this.getWolfNumberNinOptions();
        let res: boolean = false;
        for (let wolfNumberNinOption of wolfNumberNinOptions) {
            if (text == wolfNumberNinOption) {
                res = true;
            }
        }
        return res;
    }


    /**
     * textからウルフの数を取得する
     * "人"とる方が多分早いんだけどなぜかダブルチェック兼ねて配列の何番目と一致するかでやってる
     *
     * @param {string} text
     * @returns {Promise<number>}
     * @memberof WordWolf
     */
    async getWolfNumberFromText(text: string): Promise<number> {
        const wolfNumberNinOptions: string[] = await this.getWolfNumberNinOptions();
        let wolfNumber = -1;
        for (let i = 0; i < wolfNumberNinOptions.length; i++) {
            if (text == wolfNumberNinOptions[i]) {
                wolfNumber = i + 1;
            }
        }
        if (wolfNumber != -1) {
            return wolfNumber;
        } else {
            throw "ウルフの人数と一致しないよ"
        }
    }

    // ウルフの数についての関数ここまで

    // 狂人の数について

    /**
     * 狂人の数の選択肢を取得する
     * とりあえず0か1
     *
     * @returns {Promise<number[]>}
     * @memberof WordWolf
     */
    async getLunaticNumberOptions(): Promise<number[]> {
        return [0, 1];
    }

    /**
     * 狂人の数の選択肢に"人"をつけた配列を返す
     *
     * @returns {Promise<string[]>}
     * @memberof WordWolf
     */
    async getLunaticNumberNinOptions(): Promise<string[]> {
        const lunaticNumberOptions: number[] = await this.getLunaticNumberOptions();
        let lunaticNumberNinOptions: string[] = [];
        for (let i = 0; i < lunaticNumberOptions.length; i++) {
            lunaticNumberNinOptions[i] = lunaticNumberOptions[i] + "人";
        }
        return lunaticNumberNinOptions;
    }

    /**
     * textが狂人の数の選択肢と一致するかどうかを返す
     *
     * @param {string} text
     * @returns {Promise<boolean>}
     * @memberof WordWolf
     */
    async lunaticNumberExists(text: string): Promise<boolean> {
        const lunaticNumberNinOptions: string[] = await this.getLunaticNumberNinOptions();
        let res: boolean = false;
        for (let lunaticNumberNinOption of lunaticNumberNinOptions) {
            if (text == lunaticNumberNinOption) {
                res = true;
            }
        }
        return res;
    }

    /**
     * textから狂人の数を取得する
     *
     * @param {string} text
     * @returns {Promise<number>}
     * @memberof WordWolf
     */
    async getLunaticNumberFromText(text: string): Promise<number> {

        const lunaticNumberNinOptions: string[] = await this.getLunaticNumberNinOptions();
        let lunaticNumber: number = -1;
        for (let i = 0; i < lunaticNumberNinOptions.length; i++) {
            if (text == lunaticNumberNinOptions[i]) {
                lunaticNumber = i;
            }
        }
        if (lunaticNumber != -1) {
            return lunaticNumber;
        } else {
            throw "狂人の人数と一致しないよ"
        }

    }

    /**
     * 狂人のインデックスを選ぶ
     *
     * @param {number} lunaticNumber
     * @returns {Promise<number[]>}
     * @memberof WordWolf
     */
    async chooseLunaticIndexes(lunaticNumber: number): Promise<number[]> {
        const userNumber: number = await this.getUserNumber();

        const lunaticIndexes: number[] = await dabyss.chooseRandomIndexes(userNumber, lunaticNumber);
        return lunaticIndexes;
    }

    /**
     * 狂人のインデックスを更新
     *
     * @param {number} lunaticNumber
     * @returns {Promise<void>}
     * @memberof WordWolf
     */
    async updateLunaticIndexes(lunaticNumber: number): Promise<void> {
        const lunaticIndexes: number[] = await this.chooseLunaticIndexes(lunaticNumber);
        this.lunaticIndexes = lunaticIndexes;
        dabyss.dynamoUpdate(gameTable, this.gameKey, "lunatic_indexes", this.lunaticIndexes);
    }

    // 狂人の数ここまで

    async isUserWolf(userIndex: number): Promise<boolean> {
        let res: boolean = false;
        for (let wolfIndex of this.wolfIndexes) {
            if (userIndex == wolfIndex) {
                res = true;
            }
        }
        return res;
    }

    async isUserLunatic(userIndex: number): Promise<boolean> {
        let res = false;
        for (let lunaticIndex of this.lunaticIndexes) {
            if (userIndex == lunaticIndex) {
                res = true;
            }
        }
        return res;
    }

    async isUserWolfSide(userIndex: number): Promise<boolean> {
        const isUserWolf: boolean = await this.isUserWolf(userIndex);
        const isUserLunatic: boolean = await this.isUserLunatic(userIndex);
        const res: boolean = isUserWolf || isUserLunatic;
        return res;
    }

    async isWinnerArray(): Promise<boolean[]> {
        const userNumber = await this.getUserNumber();
        let res: boolean[] = [];
        const isWolfWinner: boolean = (this.winner == "wolf");
        for (let i = 0; i < userNumber; i++) {
            const isUserWolfSide = await this.isUserWolfSide(i);
            if (isWolfWinner) {
                if (!isUserWolfSide) {
                    res[i] = true;
                } else {
                    res[i] = false;
                }
            } else {
                if (!isUserWolfSide) {
                    res[i] = false;
                } else {
                    res[i] = true;
                }
            }
        }
        return res;
    }

}