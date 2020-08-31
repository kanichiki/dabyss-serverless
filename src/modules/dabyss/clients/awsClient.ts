import aws = require("aws-sdk");
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
	documentClient = new aws.DynamoDB.DocumentClient();
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
	value: any,
	asc = true,
	consistentRead = true
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
	};
	return documentClient.query(params).promise();
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

export /**
 * DynamoDB update
 *
 * @param {string} tableName
 * @param {aws.DynamoDB.DocumentClient.Key} key
 * @param {string} name
 * @param {*} value
 * @returns {Promise<any>}
 */
const dynamoUpdate = async (
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
			":v": value,
			":t": currentTime,
		},
		UpdateExpression: "SET #name = :v, #t = :t",
	};
	return documentClient.update(params, (err) => {
		if (err) {
			console.log(err);
		}
	});
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
