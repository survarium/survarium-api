'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../configs').v1.telegram;

const logKey = 'telegram:';

if (!config.token) {
	console.warn(`${logKey} no token defined`);
}

var options = {};

if (config.hook.key && config.hook.cert) {
	options.webHook = {
		port: config.hook.port,
		key: config.hook.key,
		cert: config.hook.cert
	};
} else {
	options.polling = config.server;
}

var bot = !config.disabled ? new TelegramBot(config.token, options) : { setWebHook: function () {}, sendMessage: function () {}, options: {} };
var webHook = bot.options.webHook;
if (webHook) {
	let webHookURL = `${config.hook.host}:${webHook.port}/bot/${config.token}`;
	bot.setWebHook(webHookURL, webHook.cert);
	console.log(`${logKey} started in webHook-mode on ${webHookURL}`);
} else {
	if (config.hook.del) {
		bot.setWebHook('');
		console.log(`${logKey} webHook removed`);
	}
	console.log(`${logKey} started in pooling mode`);
}

if (config.server) {
	if (!config.botan) {
		console.warn(`${logKey} no botan token defined`);
	}
	const botan = require('botanio')(config.botan);
	bot.track = botan.track.bind(botan);
}

bot.handleError = (chatId, error) => bot
	.sendMessage(chatId, `Error happen: ${error.message}`)
	.catch(() => {
		console.error(`Error happen in chat ${chatId}: ${error.message}`);
	});

module.exports = bot;
