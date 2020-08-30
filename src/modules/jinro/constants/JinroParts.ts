import dabyss = require('../../dabyss');
import line = require('@line/bot-sdk');
import jinro_module = require('../../jinro');

export const werewolf = '人狼';
export const forecaster = '占い師';
export const madman = '狂人';
export const hunter = '狩人';
export const psychic = '霊媒師';
export const citizen = '市民';
export const typeOptions: line.FlexBubble = {
	type: 'bubble',
	body: {
		type: 'box',
		layout: 'vertical',
		contents: [
			{
				type: 'text',
				text: '話し合いの方法を選んでください！',
				size: 'md',
				wrap: true,
				weight: 'bold',
				margin: 'none',
			},
			{
				type: 'separator',
				margin: 'md',
			},
			{
				type: 'text',
				text: '1：チャット(LINE)を使う',
				wrap: true,
				size: 'sm',
			},
			{
				type: 'text',
				text: '2：通話(音声のみ)を使う',
				wrap: true,
				size: 'sm',
			},
			{
				type: 'text',
				text: '3：ビデオ通話を使う',
				size: 'sm',
				wrap: true,
				margin: 'md',
			},
			{
				type: 'separator',
			},
		],
		spacing: 'xs',
		margin: 'none',
	},
	footer: {
		type: 'box',
		layout: 'vertical',
		contents: [
			{
				type: 'box',
				layout: 'horizontal',
				contents: [
					{
						type: 'button',
						action: {
							type: 'message',
							label: '1',
							text: '1',
						},
						color: dabyss.mainColor,
					},
					{
						type: 'separator',
					},
					{
						type: 'button',
						action: {
							type: 'message',
							label: '2',
							text: '2',
						},
						color: dabyss.mainColor,
					},
					{
						type: 'separator',
					},
					{
						type: 'button',
						action: {
							type: 'message',
							label: '3',
							text: '3',
						},
						color: dabyss.mainColor,
					},
				],
			},
		],
	},
	styles: {
		body: {
			separator: true,
		},
	},
};

export const settingConfirmMessage = async (userNumber: number, timer: string): Promise<line.FlexBubble> => {
	return {
		type: 'bubble',
		size: 'giga',
		body: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text',
							text: '以下の内容でよろしいですか？',
							size: 'md',
							wrap: true,
						},
					],
				},
				{
					type: 'separator',
					margin: 'md',
				},
				{
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'spacer',
						},
						{
							type: 'text',
							text: `参加者 : ${userNumber.toString()}人`,
							size: 'md',
						},
						{
							type: 'text',
							text: `役職 : ランダム`,
							size: 'md',
						},
						/* {
              "type": "text",
              "text": `話し合い方法 : ${type.toString()}`,
              "size": "md"
            }, */
						{
							type: 'text',
							text: `0日目襲撃(人狼) : なし`,
							size: 'md',
						},
						{
							type: 'text',
							text: `0日目占い(占い師) : あり`,
							size: 'md',
						},
						{
							type: 'text',
							text: `議論時間 : ${timer}`,
							size: 'md',
						},
					],
					margin: 'md',
				},
				{
					type: 'box',
					layout: 'horizontal',
					contents: [
						{
							type: 'button',
							action: {
								type: 'message',
								label: '議論時間変更',
								text: '議論時間変更',
							},
							color: dabyss.mainColor,
						},
					],
					margin: 'md',
				},
				/* {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "message",
                "label": "話し合い方法変更",
                "text": "話し合い方法変更"
              },
              "color": dabyss.mainColor
            }
          ],
          "margin": "md"
        } */
			],
		},
		footer: {
			type: 'box',
			layout: 'horizontal',
			spacing: 'sm',
			contents: [
				{
					type: 'button',
					style: 'primary',
					height: 'sm',
					action: {
						type: 'message',
						label: 'ゲームを開始する',
						text: 'ゲームを開始する',
					},
					color: dabyss.mainColor,
				},
			],
		},
		styles: {
			footer: {
				separator: true,
			},
		},
	};
};

export const timerMessage = async (): Promise<line.FlexBubble> => {
	return {
		type: 'bubble',
		body: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: '議論時間を選択してください',
					weight: 'bold',
					size: 'md',
				},
				{
					type: 'text',
					text:
						'※「時」が分に、「分」が秒に対応してます。例えば、「午後3時20分」を選択した場合、議論時間は「15分20秒」になります。わかりにくくて申し訳ないです...',
					wrap: true,
					size: 'sm',
					margin: 'md',
				},
			],
		},
		footer: {
			type: 'box',
			layout: 'vertical',
			spacing: 'sm',
			contents: [
				{
					type: 'button',
					style: 'link',
					height: 'sm',
					action: {
						type: 'datetimepicker',
						label: '議論時間設定',
						mode: 'time',
						data: 'timer',
						initial: '05:00',
						max: '23:59',
						min: '00:01',
					},
					color: dabyss.mainColor,
				},
			],
			flex: 0,
		},
	};
};

export const positionNumberMessage = async (
	positionNumbers: jinro_module.PositionNumbers
): Promise<line.FlexBubble> => {
	return {
		type: 'bubble',
		body: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: '各役職の人数は以下の通りです',
					size: 'md',
					wrap: true,
				},
				{
					type: 'separator',
					margin: 'md',
				},
				{
					type: 'text',
					text: `人狼 : ${positionNumbers.werewolf}人`,
					margin: 'md',
				},
				{
					type: 'text',
					text: `狂人 : ${positionNumbers.madman}人`,
				},
				{
					type: 'text',
					text: `占い師 : ${positionNumbers.forecaster}人`,
				},
				{
					type: 'text',
					text: `霊媒師 : ${positionNumbers.psychic}人`,
				},
				{
					type: 'text',
					text: `狩人 : ${positionNumbers.hunter}人`,
				},
				{
					type: 'text',
					text: `市民 : ${positionNumbers.citizen}人`,
				},
			],
		},
	};
};
