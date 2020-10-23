import aws = require("aws-sdk");
import "source-map-support/register";
// import AmazonDaxClient = require('amazon-dax-client');
import { DocumentClient, GetItemOutput } from "aws-sdk/clients/dynamodb";

let documentClient!: DocumentClient;

if (!documentClient) {
	// if (process.env.DaxEndpoint) {
	//     const dax: any = new AmazonDaxClient({
	//         endpoints: process.env.DaxEndpoint
	//     });
	//     documentClient = new aws.DynamoDB.DocumentClient({ service: dax });
	// } else {
	if (process.env.stage == "local" || process.env.stage == "debug") {
		documentClient = new aws.DynamoDB.DocumentClient({
			region: "localhost",
			endpoint: "http://localhost:8000",
		});
	} else {
		documentClient = new aws.DynamoDB.DocumentClient();
	}
	// }
}
import * as commonFunction from "../utils/commonFunction";

export /**
 * DynamoDB get
 *
 * @param {string} tableName
 * @param {DocumentClient.Key} key
 * @param {boolean} [consistentRead=true]
 * @returns {Promise<GetItemOutput>}
 */
const dynamoGet = async (tableName: string, key: DocumentClient.Key, consistentRead = true): Promise<GetItemOutput> => {
	const params: aws.DynamoDB.DocumentClient.GetItemInput = {
		TableName: tableName,
		Key: key,
		ConsistentRead: consistentRead,
	};
	return documentClient.get(params).promise();
};

export /**
 * DynamoDB query
 *
 * @param {string} tableName
 * @param {string} partitionKey
 * @param {*} value
 * @param {boolean} [asc=true]
 * @param {boolean} [consistentRead=true]
 * @returns {Promise<any>}
 */
const dynamoQuery = async (
	tableName: string,
	partitionKey: string,
	value: aws.DynamoDB.DocumentClient.AttributeValue,
	asc = true,
	consistentRead = true,
	limit = 1000
): Promise<DocumentClient.QueryOutput> => {
	const params: aws.DynamoDB.DocumentClient.QueryInput = {
		TableName: tableName,
		KeyConditionExpression: "#hash = :v",
		ExpressionAttributeNames: {
			"#hash": partitionKey,
		},
		ExpressionAttributeValues: {
			":v": value,
		},
		ScanIndexForward: asc,
		ConsistentRead: consistentRead,
		Limit: limit,
	};
	return documentClient.query(params).promise();
};

export const dynamoScan = async (tableName: string, limit = 1000): Promise<DocumentClient.ScanOutput> => {
	const params: aws.DynamoDB.DocumentClient.ScanInput = {
		TableName: tableName,
		Limit: limit,
	};
	return documentClient.scan(params).promise();
};

export /**
 * DynamoDB セカンダリインデックスでquery
 *
 * @param {string} tableName
 * @param {string} indexName
 * @param {string} partitionKey
 * @param {(string | number)} value
 * @param {boolean} [asc=true]
 * @returns {Promise<any>}
 */
const dynamoQuerySecondaryIndex = async (
	tableName: string,
	indexName: string,
	partitionKey: string,
	value: string | number,
	asc = true
): Promise<any> => {
	const params: aws.DynamoDB.DocumentClient.QueryInput = {
		TableName: tableName,
		IndexName: indexName,
		KeyConditionExpression: "#hash = :v",
		ExpressionAttributeNames: {
			"#hash": partitionKey,
		},
		ExpressionAttributeValues: {
			":v": value,
		},
		ScanIndexForward: asc,
	};
	return documentClient.query(params).promise();
};

export /**
 * DynamoDB put
 *
 * @param {string} tableName
 * @param {aws.DynamoDB.DocumentClient.PutItemInputAttributeMap} item
 * @returns {Promise<any>}
 */
const dynamoPut = async (
	tableName: string,
	item: aws.DynamoDB.DocumentClient.PutItemInputAttributeMap
): Promise<any> => {
	const currentTime: string = await commonFunction.getCurrentTime();
	item["created_at"] = currentTime;
	const params: aws.DynamoDB.DocumentClient.PutItemInput = {
		TableName: tableName,
		Item: item,
	};
	return documentClient.put(params, (err) => {
		if (err) {
			console.log(err);
		}
	});
};

/**
 * DynamoDB update
 *
 * @param {string} tableName
 * @param {aws.DynamoDB.DocumentClient.Key} key
 * @param {string} name
 * @param {*} value
 * @returns {Promise<any>}
 */
// export const dynamoUpdate = async (
// 	tableName: string,
// 	key: aws.DynamoDB.DocumentClient.Key,
// 	name: string,
// 	value: any
// ): Promise<any> => {
// 	const currentTime: string = await commonFunction.getCurrentTime();
// 	const params: aws.DynamoDB.DocumentClient.UpdateItemInput = {
// 		TableName: tableName,
// 		Key: key,
// 		ExpressionAttributeNames: {
// 			"#name": name,
// 			"#t": "updated_at",
// 		},
// 		ExpressionAttributeValues: {
// 			":v": value,
// 			":t": currentTime,
// 		},
// 		UpdateExpression: "SET #name = :v, #t = :t",
// 	};
// 	return documentClient.update(params, (err) => {
// 		if (err) {
// 			console.log(err);
// 		}
// 	});
// };

export const dynamoUpdate = async (
	tableName: string,
	item: aws.DynamoDB.DocumentClient.PutItemInputAttributeMap
): Promise<any> => {
	const currentTime: string = await commonFunction.getCurrentTime();
	item["updated_at"] = currentTime;
	const params: aws.DynamoDB.DocumentClient.PutItemInput = {
		TableName: tableName,
		Item: item,
	};
	await documentClient.put(params, (err) => {
		if (err) {
			console.log(err);
		}
	});
	return;
};

export const dynamoAppend = async (
	tableName: string,
	key: aws.DynamoDB.DocumentClient.Key,
	name: string,
	value: any
): Promise<any> => {
	const currentTime: string = await commonFunction.getCurrentTime();
	const params: aws.DynamoDB.DocumentClient.UpdateItemInput = {
		TableName: tableName,
		Key: key,
		ExpressionAttributeNames: {
			"#name": name,
			"#t": "updated_at",
		},
		ExpressionAttributeValues: {
			":v": [value],
			":t": currentTime,
		},
		UpdateExpression: "SET #name = list_append(#name, :v), #t = :t",
	};
	return documentClient.update(params, (err) => {
		if (err) {
			console.log(err);
		}
	});
};

export const getLambdaClient = async (): Promise<aws.Lambda> => {
	let endpoint!: string;
	if (process.env.stage == "local") {
		endpoint = "http://localhost:3002";
	} else {
		endpoint = "https://lambda.ap-northeast-1.amazonaws.com";
	}

	const lambda = new aws.Lambda({
		apiVersion: "latest",
		endpoint: endpoint,
	});
	return lambda;
};
