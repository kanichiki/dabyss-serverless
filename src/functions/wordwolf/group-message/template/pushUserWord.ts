import line = require('@line/bot-sdk');

export const main = async (displayName: string, userWord: string, isLunatic: boolean): Promise<line.TextMessage[]> => {
    let reply: line.TextMessage[] = [];

    if (!isLunatic) {
        reply = [
            {
                type: "text",
                text: `${displayName}さんのワードは\n\n${userWord}\n\nです！`
            }
        ]
    } else {
        reply = [
            {
                type: "text",
                text: `あなたは「狂人」です。ただし、ウルフを兼ねている可能性もあるので気をつけてください\n\n${displayName}さんのワードは\n\n${userWord}\n\nです！`
            }
        ]
    }
    return reply;
}