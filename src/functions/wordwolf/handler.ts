import dabyss = require("../../modules/dabyss");
import line = require("@line/bot-sdk");
import { Handler } from "aws-lambda";

export const handler: Handler = async (lineEvent: line.MessageEvent | line.PostbackEvent) => {
	console.log(lineEvent);

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
