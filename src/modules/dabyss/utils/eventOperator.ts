import { Game } from "../classes/Game";

export const replyTimerChosen = async (game: Game, time: string): Promise<void> => {
	const promises: Promise<void>[] = [];

	const settingIndex = await game.getSettingIndex("timer");

	promises.push(game.updateTimer(time));
	promises.push(game.updateSettingStateTrue(settingIndex));

	await Promise.all(promises);
	return;
};
