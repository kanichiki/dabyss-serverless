import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Player } from "../classes/Player"


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

export class Jinro extends dabyss.Game {
    settingNames: string[];
    defaultSettingStatus: boolean[];
    talkType: number;
    positionNames: PositionNames;
    positionNumbers: PositionNumbers;
    players: Player[];

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
		};

		this.talkType = -1;
		this.positionNumbers = {
			werewolf: 0,
			madman: 0,
			forecaster: 0,
			psychic: 0,
			hunter: 0,
			citizen: 0,
		};
    }
    
    async init(): Promise<void> {
        try {
            const data: DocumentClient.QueryOutput = await dabyss.dynamoQuery(
				gameTable,
				"group_id",
				this.groupId,
				false
			);
			if (data.Count != undefined) {
				if (data.Count > 0) {
					this.exists = true;
					if (data.Items != undefined) {
						const game: DocumentClient.AttributeMap = data.Items[0];

						this.gameId = game.game_id as number;
						this.gameKey = {
							group_id: this.groupId,
							game_id: this.gameId,
						};
						this.userIds = game.user_ids as string[];
						// TODO: ここ合ってる？
						for (let i = 0; i < this.userIds.length; i++) {
							this.players[i] = new Player(this.userIds[i]);
						}
						this.day = game.day as number;
						this.gameName = game.game_name as string;
						this.gameStatus = game.game_status as string;
						this.settingStatus = game.setting_status as boolean[];
						this.timer = game.timer as string;
						this.winner = game.winner as string;
						this.talkType = game.talk_type as number;
					}
				}
			}

        } catch (err) {
            console.error(err);
            console.error("JinroGameの初期化失敗")
        }
    }

    static async createInstance(groupId: string): Promise<dabyss.Game> {
        const jinrogame: dabyss.Game = new dabyss.Game(groupId);
        await jinrogame.init();
        return jinrogame;
    }

    async update(): Promise<void> {
        const jinrogame = {
            group_id: this.groupId,
			game_id: this.gameId,
			user_ids: this.userIds,
			day: this.day,
			game_name: this.gameName,
			game_status: this.gameStatus,
			setting_status: this.settingStatus,
			timer: this.timer,
			winner: this.winner,
            talk_type: this.talkType,
            players: this.players,
        };
        await dabyss.dynamoUpdate(gameTable, jinrogame)
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
		this.positionNumbers.citizen =
			userNumber -
			(this.positionNumbers.werewolf +
				this.positionNumbers.madman +
				this.positionNumbers.forecaster +
				this.positionNumbers.psychic +
				this.positionNumbers.hunter);
        await this.update();
    }

    async updatePositions() {
		await this.updatePositionNumbers();
		const positions: string[] = [];

		for (let i = 0; i < this.positionNumbers.werewolf; i++) {
			positions.push("人狼");
		}
		for (let i = 0; i < this.positionNumbers.madman; i++) {
			positions.push("狂人");
		}
		for (let i = 0; i < this.positionNumbers.forecaster; i++) {
			positions.push("占い師");
		}
		for (let i = 0; i < this.positionNumbers.psychic; i++) {
			positions.push("霊媒師");
		}
		for (let i = 0; i < this.positionNumbers.hunter; i++) {
			positions.push("狩人");
		}
		for (let i = 0; i < this.positionNumbers.citizen; i++) {
			positions.push("市民");
		}
		// ランダム並べ替え
		for (let i = positions.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = positions[i];
			positions[i] = positions[j];
			positions[j] = tmp;
		}
        
		for (let i = 0; i < this.players.length; i++) {
            this.players[i].position = positions[i];    
        }
		await this.update();
    }
    
    async updateTalkType(type: number): Promise<void> {
		this.talkType = type;
		await this.update();
    }
    
    async updateDefaultAliveStatus(): Promise<void> {
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].isAlive = true;
		}
		await this.update();
	}

	async updateDefaultReadyStatus(): Promise<void> {
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].isReady = false;
		}
		await this.update();
	}

	async getAliveNumber(): Promise<number> {
		let aliveNum = 0;
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].isAlive) {
				aliveNum++;
			}
		}
		return aliveNum;
	}

	async getAliveWerewolfNumber(): Promise<number> {
		let aliveNum = 0;
		for (let i = 0; i < this.players.length; i++) {
			const player: Player = this.players[i]
			if (player.position == this.positionNames.werewolf) {
				if (player.isAlive) {
					aliveNum++;
				}
			}
		}
		return aliveNum;
	}
	
	async getAliveNotWerewolfNumber(): Promise<number> {
		const aliveNumber = await this.getAliveNumber();
		const aliveWerewolfNumber = await this.getAliveWerewolfNumber();
		return aliveNumber - aliveWerewolfNumber;
	}

	async isWerewolfWin(): Promise<boolean> {
		const aliveNumber: number = await this.getAliveNumber();
		const werewolfNumber: number = this.positionNumbers.werewolf;
		const isWerewolfWin: boolean = aliveNumber - werewolfNumber <= werewolfNumber;
		return isWerewolfWin;
	}

	async isCitizenWin(): Promise<boolean> {
		const aliveWerewolfNumber = await this.getAliveWerewolfNumber();
		return aliveWerewolfNumber == 0;
	}

	async getDeadPlayers(): Promise<Player[]> {
		const deadPlayers: Player[] = [];
		for (let i = 0; i < this.players.length; i++) {
			const player = this.players[i];
			if (!player.isAlive) {
				deadPlayers.push(player);
			}
		}
		return deadPlayers
	}

	async getAlivePlayersExceptOneself(oneself: Player): Promise<Player[]> {
		const alivePlayers: Player[] = [];
		for (let i = 0; i < this.players.length; i++) {
			const player: Player = this.players[i]
			if (player != oneself && player.isAlive) {
				alivePlayers.push(player);
			}
		}
		return alivePlayers;
	}

	async getAliveDisplayNamesExceptOneself(oneself: Player): Promise<string[]> {
		const aliveDisplayNames: string[] = [];
		const alivePlayers: Player[] = await this.getAlivePlayersExceptOneself(oneself);
		for (let i = 0; i < alivePlayers.length; i++) {
			aliveDisplayNames.push(alivePlayers[i].displayName);
		}
		return aliveDisplayNames;
	}

	async getAliveUserIndexesExceptOneself(oneself: Player): Promise<number[]> {
		const aliveUserIndexes: number[] = [];
		const alivePlayers: Player[] = await this.getAlivePlayersExceptOneself(oneself);
		for (let i = 0; i < alivePlayers.length; i++) {
			aliveUserIndexes.push(i);
		}
		return aliveUserIndexes;
	}

	async getDeadDisplayNamesExceptOneself(oneself: Player): Promise<string[]> {
		const deadDisplayNames: string[] = [];
		const deadPlayers: Player[] = await this.getDeadPlayers();
		for (let i = 0; i < deadPlayers.length; i++) {
			deadDisplayNames.push(deadPlayers[i].displayName);
		}
		return deadDisplayNames;
	}

	async getDeadIndexes(oneself: Player): Promise<number[]> {
		const deadUserIndexes: number[] = [];
		const deadPlayers: Player[] = await this.getDeadPlayers();
		for (let i = 0; i < deadPlayers.length; i++) {
			deadUserIndexes.push(i);
		}
		return deadUserIndexes;
	}

	async isAllMembersGetReady(): Promise<boolean> {
		let isAllMembersGetReady: boolean = true;
		for (let i = 0; i < this.players.length; i++) {
			const player: Player = this.players[i];
			if (!player.isReady) {
				isAllMembersGetReady = false;
			}
		}
		return isAllMembersGetReady;
	}
	async getWinnerIndexes(): Promise<number[]> {
		const res: number[] = [];
		for (let i = 0; i < this.players.length; i++) {
			const player = this.players[i]
			const isWolfSide =
				player.position == this.positionNames.werewolf || player.position == this.positionNames.madman;
			if (this.winner == "werewolf") {
				// 人狼陣営勝利なら
				if (isWolfSide) {
					res.push(i);
				}
			} else {
				// 市民陣営勝利なら
				if (!isWolfSide) {
					res.push(i);
				}
			}
		}
		return res;
	}

	async getRevotingCount(): Promise<number> {
		let count = 0;
		for (let i = 0; this.players.length; i++) {
			if (count < this.players[i].voteTarget[-1].length) {
				count = this.players[i].voteTarget[-1].length;
			}
		}
		return count;
	}
	
	async getMostPolledPlayersIndexes(): Promise<number[]> {
		let players: number[] = [];
		let max = -1;
		let votesArray: number[] = new Array(this.players.length).fill(0);
		for (let i = 0; i < this.players.length; i++) {
			const votedPlayerIndex: number = this.players[i].voteTarget[-1][-1];
			votesArray[votedPlayerIndex] += 1;
		}
		for (const votes of votesArray) {
			if (votes > max) {
				max = votes;
			}
		}
		for (let i = 0; this.players.length; i++) {
			if (votesArray[i] == max) {
				players.push(i);
			}
		}
		return players;
	}

	async getMostPolledPlayers(): Promise<Player[]> {
		let players: Player[] = [];
		let max = -1;
		let votesArray: number[] = new Array(this.players.length).fill(0);
		for (let i = 0; i < this.players.length; i++) {
			const votedPlayerIndex: number = this.players[i].voteTarget[-1][-1];
			votesArray[votedPlayerIndex] += 1;
		}
		for (const votes of votesArray) {
			if (votes > max) {
				max = votes;
			}
		}
		for (let i = 0; this.players.length; i++) {
			if (votesArray[i] == max) {
				players.push(this.players[i]);
			}
		}
		return players;
	}

	async chooseExecutedPlayerRandomly(players: Player[]): Promise<Player> {
		const index = Math.floor(Math.random() * players.length); // これは返さない
		return players[index];
	}

	async putAction() {
		for (let i = 0; i < this.players.length; i++) {
			const player: Player = this.players[i]
			if (
				player.position == this.positionNames.madman ||
				player.position == this.positionNames.citizen ||
				!player.isAlive
			) {
				player.isReady = true
			} else {
				player.isReady = false
			}
		}
		await this.update();
	}

}

