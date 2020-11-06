import line = require("@line/bot-sdk");

export const main = async (displayName: string): Promise<line.Message[]> => {
    return [
        {
            type: "text",
            text: `${displayName}さんを洗脳します`,
        },
    ];
};
