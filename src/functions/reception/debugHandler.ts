import line = require("@line/bot-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";
import * as entry from "../entry/debugHandler";

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

    for (const lineEvent of lineEvents) {
        if (lineEvent.replyToken != undefined) {
            await entry.handler(lineEvent);
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
