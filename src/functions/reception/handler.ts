import line = require('@line/bot-sdk');
import aws = require('aws-sdk');
import dabyss = require('../../modules/dabyss');
import { StartExecutionInput } from 'aws-sdk/clients/stepfunctions';
import { Lambda } from 'aws-sdk';
import { InvocationRequest } from 'aws-sdk/clients/lambda';

exports.handler = async (event: any, context: any): Promise<any> => {
    const promises: Promise<any>[] = [];
    const obj = JSON.parse(event.body);
    const lineEvents: (line.MessageEvent | line.PostbackEvent)[] = obj.events;
    console.log(lineEvents);
    const stepFunctions = new aws.StepFunctions();

    lineEvents.forEach(async (lineEvent) => {
        if (lineEvent.replyToken != undefined) {
            const eventObject: { [key: string]: line.WebhookEvent } = {
                event: lineEvent
            }
            const input: StartExecutionInput = {
                stateMachineArn: process.env.stateMachineArn,
                input: JSON.stringify(eventObject)
            }
            promises.push(stepFunctions.startExecution(input).promise());
        }
    });

    const lambda = new Lambda();
    const input: InvocationRequest = {
        FunctionName: process.env.notifyFunctionArn,
        InvocationType: "Event"
    }
    promises.push(lambda.invoke(input).promise());

    await Promise.all(promises);
    return {
        statusCode: 200
    };
}
