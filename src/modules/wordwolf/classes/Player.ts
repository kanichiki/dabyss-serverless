import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const userTable = process.env.userTable;

export class Player extends dabyss.User {
    displayName: string;
    position: string;
    isReady: boolean;
    voteTarget: number[];

    constructor(userId: string) {
        super(userId);
        this.userId = userId;
        this.displayName = "";
        this.position = "";
        this.isReady = false;
        this.voteTarget = [];
    }

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

    // TODO: DBupdateをする関数をかく
    async updatePosition(newPosition: string): Promise<void> {
        this.position = newPosition;
    }

    async resetReadyStatus(): Promise<void> {
        this.isReady = false;
    }

    async getReady(): Promise<void> {
        this.isReady = true;
    }

    async vote(voteTarget: number): Promise<void> {
        const voteCount = this.voteTarget.length
        this.voteTarget[voteCount] = voteTarget;
        this.getReady();
    }

    async isWolf(): Promise<boolean> {
        return (this.position == "ウルフ")
    }
}