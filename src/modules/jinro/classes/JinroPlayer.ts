import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { User } from "../../dabyss";

const playerTable = process.env.playerTable;
const userTable = process.env.userTable;

export class Player extends User {
    playerId: number;
    position: string;
    isAlive: boolean;
    isReady: boolean;
    voteTarget: number[][];
    actionTarget: number[][];

    constructor(userId: string) {
        super(userId);
        this.userId = userId;
        this.position = "";
        this.isAlive = true;
        this.isReady = false;
        this.voteTarget = [];
        this.actionTarget = [];
    };

    async init(): Promise<void> {
        try {
            const data: DocumentClient.QueryOutput = await dabyss.dynamoQuery(
                userTable,
                "user_id",
                this.userId,
                false
            );
            if (data.Count != undefined) {
                if (data.Count > 0 && data.Items != undefined) {
                    const user: DocumentClient.AttributeMap = data.Items[0];
                    this.userId = user.user_id as string;
                };
            };
        } catch (err) {
            console.error(err);
            console.error("playerの初期化失敗");
        }
    }

    static async createInstance(userId: string): Promise<Player> {
        const player: Player = new Player(userId);
        await player.init();
        return player;
    }

    // こんな風にデータをいじるのは書かずに、あとでまとめてデータ処理できるようになりたいねえ
    async updatePosition(newPosition: string): Promise<void>{
        this.position = newPosition;
    }
    
    async die(): Promise<void> {
        this.isAlive = false;
    }

    async getReady(): Promise<void> {
        this.isReady = true;
    }

    async isWerewolf(): Promise<boolean> {
        return (this.position == "人狼");
    }
}

