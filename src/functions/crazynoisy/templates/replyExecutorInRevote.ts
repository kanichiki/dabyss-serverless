import line = require("@line/bot-sdk");

export const main = async (executorDisplayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `得票数が並んだため、ランダムで${executorDisplayName}さんが拷問にかけられました`,
        },
    ];
};
