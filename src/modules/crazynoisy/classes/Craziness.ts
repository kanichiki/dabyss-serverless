import dabyss = require("../../dabyss");
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const crazinessTable = process.env.crazinessTable;

export class Craziness {
	crazinessId: number;
	crazinessKey: DocumentClient.Key;
	content: string;
	remark: string;
	type: number;
	level: number;

	constructor(crazinessId: number) {
		this.crazinessId = crazinessId;
		this.crazinessKey = {
			craziness_id: this.crazinessId,
		};

		this.content = "";
		this.remark = "";
		this.type = -1;
		this.level = -1;
	}

	async init(): Promise<void> {
		try {
			const data: DocumentClient.GetItemOutput = await dabyss.dynamoGet(crazinessTable, this.crazinessKey);
			if (data.Item != undefined) {
				const craziness: DocumentClient.AttributeMap = data.Item;
				this.content = craziness.content as string;
				this.remark = craziness.remark as string;
				this.type = craziness.type as number;
				this.level = craziness.level as number;
			} else {
				throw new Error("データが見つかりません");
			}
		} catch (err) {
			console.error(err);
		}
	}

	static async createInstance(crazinessId: number): Promise<Craziness> {
		const craziness: Craziness = new Craziness(crazinessId);
		await craziness.init();
		return craziness;
	}

	static async getCrazinessIdsMatchType(type: number): Promise<number[]> {
		const secondaryIndex = "type-craziness_id-index";
		const crazinessIds: number[] = [];
		for (let i = 1; i <= type; i++) {
			const data: DocumentClient.QueryOutput = await dabyss.dynamoQuerySecondaryIndex(
				crazinessTable,
				secondaryIndex,
				"type",
				i
			);
			if (data.Items != undefined) {
				for (const item of data.Items) {
					crazinessIds.push(item.craziness_id);
				}
			}
		}
		return crazinessIds;
	}
}
