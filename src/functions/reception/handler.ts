import line = require("@line/bot-sdk");
import aws = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event) => {
    const obj = JSON.parse(event.body);
    if (obj.events == undefined) {
        return {
            statusCode: 400,
            body: JSON.stringify(
                {
                    message: "Bad Request",
                },
                null,
                2
            ),
        };
    }
    const lineEvents: (line.MessageEvent | line.PostbackEvent)[] = obj.events;
    console.log(lineEvents);

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

    console.log(process.env.entryFunction);
    for (const lineEvent of lineEvents) {
        if (lineEvent.replyToken != undefined) {
            await lambda
                .invoke({
                    FunctionName: process.env.entryFunction,
                    InvocationType: "Event",
                    Payload: JSON.stringify(lineEvent),
                })
                .promise();
        }
    }
    //
    // await lambda
    // 	.invoke({
    // 		FunctionName: process.env.notifyFunction,
    // 		InvocationType: "Event",
    // 	})
    // 	.promise();

    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "success",
            },
            null,
            2
        ),
    };
};
