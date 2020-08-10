import aws = require('aws-sdk');
import line = require('@line/bot-sdk');

let lineClient: line.Client;

const getLineConfig = async (): Promise<{ [key: string]: string }> => {
    const region: string = "ap-northeast-1";
    const secretName: string = "dabyss-dev-line";
    let secretString!: string;

    const client: aws.SecretsManager = new aws.SecretsManager({
        region: region
    });

    await client.getSecretValue({ SecretId: secretName }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            if (data.SecretString != undefined) {
                secretString = data.SecretString;
            }
        }
    }).promise();

    const secret: { [key: string]: string } = JSON.parse(secretString);
    return secret;
}

const createLineClient = async (): Promise<line.Client> => {
    const secret: { [key: string]: string } = await getLineConfig();
    const config: line.ClientConfig = {
        channelAccessToken: secret.channelAccessToken,
        channelSecret: secret.channelSecret
    };
    const client = new line.Client(config);
    return client;
}

export /**
 * channelId取得
 *
 * @returns {Promise<string>}
 */
    const getChannelId = async (): Promise<string> => {
        const secret: { [key: string]: string } = await getLineConfig();
        return secret.channelId;
    }

export /**
 * messageをreplyする
 *
 * @param {string} replyToken
 * @param {(line.Message | line.Message[])} messages
 * @returns {Promise<void>}
 */
    const replyMessage = async (replyToken: string, messages: line.Message | line.Message[]): Promise<void> => {
        if (!lineClient) {
            lineClient = await createLineClient();
        }

        await lineClient.replyMessage(replyToken, messages);
    }

export /**
 * messageをpush
 *
 * @param {string} to
 * @param {(line.Message | line.Message[])} messages
 * @returns {Promise<void>}
 */
    const pushMessage = async (to: string, messages: line.Message | line.Message[]): Promise<void> => {
        if (!lineClient) {
            lineClient = await createLineClient();
        }

        await lineClient.pushMessage(to, messages);
    }

export /**
 * profileを取得
 *
 * @param {string} userId
 * @returns {Promise<line.Profile>}
 */
    const getProfile = async (userId: string): Promise<line.Profile> => {
        if (!lineClient) {
            lineClient = await createLineClient();
        }

        const profile: line.Profile = await lineClient.getProfile(userId);
        return profile;
    }