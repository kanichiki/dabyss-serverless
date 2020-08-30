export const makeShuffleNumberArray = async (number: number): Promise<number[]> => {
	const shuffleNumbers: number[] = [];
	LOOP: for (let i = 0; i < number; i++) {
		for (;;) {
			const num: number = Math.floor(Math.random() * number);
			let status = true;
			for (const shuffleNumber of shuffleNumbers) {
				if (shuffleNumber == num) {
					status = false;
				}
			}
			if (status) {
				shuffleNumbers.push(num);
				continue LOOP;
			}
		}
	}

	return shuffleNumbers;
};

export const calculateMaxNumberLessThanHalf = async (number: number): Promise<number> => {
	let res = 0;
	if (number % 2 == 0) {
		res = number / 2 - 1;
	} else {
		res = number / 2;
	}
	return res;
};

export const convertDateToString = async (date: Date): Promise<string> => {
	const year: number = date.getFullYear();
	const yearString: string = year.toString();
	const month: number = date.getMonth() + 1; // 1月は0らしい
	let monthString: string = month.toString();
	if (month < 10) {
		monthString = '0' + monthString;
	}
	const day: number = date.getDate();
	let dayString: string = day.toString();
	if (day < 10) {
		dayString = '0' + dayString;
	}
	const hours: number = date.getHours();
	let hoursString: string = hours.toString();
	if (hours < 10) {
		hoursString = '0' + hoursString;
	}
	const minutes: number = date.getMinutes();
	let minutesString: string = minutes.toString();
	if (minutes < 10) {
		minutesString = '0' + minutesString;
	}
	const second: number = date.getSeconds();
	let secondString: string = second.toString();
	if (second < 10) {
		secondString = '0' + secondString;
	}

	return (
		yearString + '-' + monthString + '-' + dayString + ' ' + hoursString + ':' + minutesString + ':' + secondString
	);
};

export const getCurrentTime = async (): Promise<string> => {
	const currentTime: Date = new Date();
	const currentTimeString: string = await convertDateToString(currentTime);
	return currentTimeString;
};

export declare type Interval = {
	hours: number;
	minutes: number;
	seconds: number;
};

export const convertIntervalToString = async (interval: Interval): Promise<string> => {
	let hoursString: string = interval.hours.toString();
	if (interval.hours < 10) {
		hoursString = '0' + hoursString;
	}
	let minutesString: string = interval.minutes.toString();
	if (interval.minutes < 10) {
		minutesString = '0' + minutesString;
	}
	let secondsString: string = interval.seconds.toString();
	if (interval.seconds < 10) {
		secondsString = '0' + secondsString;
	}

	const timeString: string = hoursString + ':' + minutesString + ':' + secondsString;
	return timeString;
};

export const convertIntervalToTimerString = async (interval: Interval): Promise<string> => {
	let timerString = '';
	if (interval.hours != 0) {
		timerString += interval.hours.toString() + '時間';
	}
	if (interval.minutes != 0) {
		timerString += interval.minutes.toString() + '分';
	}
	if (interval.seconds != 0) {
		timerString += interval.seconds.toString() + '秒';
	}
	return timerString;
};

export const getTimerObject = async (timerString: string): Promise<Interval> => {
	const timerArray: string[] = timerString.split(':');
	const timerObject: Interval = {
		hours: Number(timerArray[0]),
		minutes: Number(timerArray[1]),
		seconds: Number(timerArray[2]),
	};
	return timerObject;
};

export const getEndTime = async (startTimeString: string, timerString: string): Promise<string> => {
	const startTime: Date = new Date(startTimeString);
	const endTime: Date = startTime;
	const timer = await getTimerObject(timerString);
	endTime.setHours(endTime.getHours() + timer.hours);
	endTime.setMinutes(endTime.getMinutes() + timer.minutes);
	endTime.setSeconds(endTime.getSeconds() + timer.seconds);
	const endTimeString: string = await convertDateToString(endTime);
	return endTimeString;
};

export const getRemainingTime = async (endTimeString: string): Promise<Interval> => {
	const currentTime: Date = new Date();
	const endTime: Date = new Date(endTimeString);

	let diff: number = endTime.getTime() - currentTime.getTime();
	console.log(diff);

	const hours: number = Math.floor(diff / (1000 * 60 * 60));
	diff = diff % (1000 * 60 * 60);
	const minutes: number = Math.floor(diff / (1000 * 60));
	diff = diff % (1000 * 60);
	const seconds: number = Math.floor(diff / 1000);

	const remainingTime: Interval = {
		hours: hours,
		minutes: minutes,
		seconds: seconds,
	};

	return remainingTime;
};

/**
 * 与えられたuserNumberの数の中からchooseNumberの数だけランダムに選んでその配列を返す
 *
 * @param {*} userNumber
 * @param {*} chooseNumber
 * @returns
 */
export const chooseRandomIndexes = async (userNumber: number, chooseNumber: number): Promise<number[]> => {
	const randomIndexes: number[] = [];
	LOOP: for (let i = 0; i < chooseNumber; i++) {
		for (;;) {
			const num: number = Math.floor(Math.random() * userNumber);
			let status = true;
			for (const randomIndex of randomIndexes) {
				if (randomIndex == num) {
					status = false;
				}
			}
			if (status) {
				randomIndexes.push(num);
				continue LOOP;
			}
		}
	}
	return randomIndexes;
};

/**
 * 与えられたインデックスの中からchooseNumberの数だけランダムに抽出して配列で返す
 * indexes.length >= chooseNumber
 *
 * @param {*} indexes
 * @param {*} chooseNumber
 */
export const getRandomIndexes = async (indexes: number[], chooseNumber: number): Promise<number[]> => {
	const randomIndexes: number[] = [];
	LOOP: for (let i = 0; i < chooseNumber; i++) {
		for (;;) {
			const num: number = Math.floor(Math.random() * indexes.length);
			const index: number = indexes[num];
			let status = true;
			for (const randomIndex of randomIndexes) {
				if (randomIndex == index) {
					status = false;
				}
			}
			if (status) {
				randomIndexes.push(index);
				continue LOOP;
			}
		}
	}
	return randomIndexes;
};

export const getRandomNumber = async (minNumber: number, maxNumber: number): Promise<number> => {
	const number = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
	return number;
};

export const getRandomBoolean = async (): Promise<boolean> => {
	const i: number = Math.floor(Math.random() * 2);
	if (i == 1) {
		return true;
	} else {
		return false;
	}
};
