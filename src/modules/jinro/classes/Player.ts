import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { User } from "../../dabyss";

const userTable = process.env.userTable;

export class Player extends User {
    playerId: number;
    displayName: string;
    position: string;
    isAlive: boolean;
    isReady: boolean;
    voteTarget: number[][];
    actionTarget: number[][];

    constructor(userId: string) {
        super(userId);
        this.userId = userId;
        this.displayName = ""
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
        player.displayName = await player.getDisplayName();
        return player;
    }
    // こんな風にデータをいじるのは書かずに、あとでまとめてデータ処理できるようになりたいねえ
    // TODO: DBupdateをする関数をかく
    async updatePosition(newPosition: string): Promise<void>{
        this.position = newPosition;
    }
    
    async die(): Promise<void> {
        this.isAlive = false;
    }

    async resetReadyStatus(): Promise<void> {
        this.isReady = false;
    }

    async getReady(): Promise<void> {
        this.isReady = true;
    }

    async vote(voteTarget: number): Promise<void> {
        this.voteTarget[-1][-1] = voteTarget;
        this.isReady = true;
    }

    async act(actionTarget: number): Promise<void> {
        this.actionTarget[-1][-1] = actionTarget;
        this.isReady = true;
    }

    async isWerewolf(): Promise<boolean> {
        return (this.position == "人狼");
    }
}


