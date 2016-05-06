'use strict';

var Discord = require('discord.js');
var debug = require('debug')('discord');

var config = require('../../../configs');

var connectionParams = { autoReconnect: true, maxCachedMessages: 5 };
var channels = [];

var bot = new Discord.Client(connectionParams);

bot
	.on('error', (err) => {
		debug('bot:err', err);
	})
	.on('ready', () => {
		debug('bot:ready');

		let botChannels = bot.channels;
		channels = Object
			.keys(botChannels)
			.map(Number)
			.reduce((result, pos) => {
				if (isNaN(pos) || botChannels[pos].name !== config.discord.devChannel) {
					return result;
				}

				result.push(botChannels[pos]);
				return result;
			}, []);
	})
	.loginWithToken(config.discord.token);

var sendMessage = function (message) {
	return new Promise((resolve, reject) => {
		if (!channels.length) {
			return reject(`no target channels available`);
		}

		var i = 0;
		var next = function () {
			let channel = channels[i++];

			if (!channel) {
				return resolve();
			}
			
			bot
				.sendMessage(channel, message)
				.then(() => debug('bot:message:ok'))
				.catch(err => debug('bot:message:err', err))
				.then(next);
		};

		next();
	});
};

function toMD(val) {
	return val.replace(/^\s+/, '')
		.replace(/<\/blockquote>/gm, '\n')
		.replace(/<br>{1,}/gm, '\n')
		.replace(/&quot;/gm, '"')
		.replace(/<cite>((?:.|\n)*?)<\/cite>/gm, '*$1*\n')
		.replace(/<b>((?:.|\n)*?)<\/b>/gm, '**$1**')
		.replace(/<([^>]+) (style="([^"]*)font-weight: bold([^"]*)")([^>]*)>([^<]*)<\/[^<]+>/gm, '**$6**')
		.replace(/<a([^>]*) (href="([^"]*)")([^>]*)>([^<]*)<\/a>/igm, '$5 ($3)')
		.replace(/<(?:.|\n)*?>/gm, '')
		;
}

var devmessage = (function (storage) {
	var running;

	var next = function (done) {
		if (done) {
			running = false;
		}
		if (running) {
			return;
		}
		var message = storage.shift();
		if (!message) {
			return;
		}

		running = true;

		return sendMessage(message)
			.then(() => {
				debug('bot:message:sent', message);
			})
			.catch(err => debug('bot:message:err', err))
			.then(() => {
				next(true);
			});
	};

	var post = function (params) {
		let message = params.message;
		let dev     = params.dev;
		let url     = params.url;

		let text = toMD(message.text);

		const head = toMD(`<b>${dev.name}</b>: ${message.topic.id ? '<a href="' + url + '">' + message.topic.name + '</a>' : ''}\n`);
		const SIZE = 2000 - head.length;

		const length = text.length;

		let send = function (text) {
			let print = `${head}${text}`;
			storage.push(print);
			next();
		};

		if (length < SIZE) {
			send(text);
		} else {
			for (let size = 0; size < length;) {
				let chunk = text.substr(size, SIZE);
				let lastDot = chunk.lastIndexOf('.');
				if (lastDot !== -1) {
					lastDot += 1;
					send(text.substr(size, lastDot));
					size += lastDot;
				} else {
					send(chunk);
					size += SIZE;
				}
			}
		}
	};

	return function (params) {
		post(params);
	};
})([]);

exports.devmessage = devmessage;
