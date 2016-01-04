'use strict';

const model = require('./model');
const events = require('./events');
const bot = require('../../lib/telegram');
const utils = require('../../lib/utils');
const Matches = require('../../components/matches/controller');

bot.onText(/^\/import_stats$/, message => {
	let chatId = message.chat.id;
	bot.track(message, 'ImportStats');
	bot.sendChatAction(chatId, 'typing');
	Matches
		.stats()
		.then(stats => {
			var message = Object.keys(stats).map(key => {
				let info = stats[key];
				return `${info.host ? '[' + info.host + ']\n' : ''}${key.replace(/.*load:([^:]*):last.*/, '$1')} | ${info.id} | ${utils.time(info.date, true)}`;
			}).join('\n');
			bot.sendMessage(chatId, message);
		})
		.catch(bot.handleError.bind(bot, chatId));
});

bot.onText(/^\/import_subscribe_status$/, message => {
	let chatId = message.chat.id;
	let userId = message.from.id;
	bot.track(message, 'ImportStatsSubscribe');
	bot.sendChatAction(chatId, 'typing');
	return model
		.findOne({ user: userId, chat: chatId, events: { $elemMatch: { $eq: events.IMPORT_STATUS } } })
		.lean()
		.then(result => {
			if (result) {
				return bot.sendMessage(chatId, `You are already subscribed for import status. Send /import_unsubscribe_status to unsubscribe.\n`)
			}
			return model
				.findOneAndUpdate(
					{ user: userId, chat: chatId },
					{ $push: { events: events.IMPORT_STATUS } },
					{ upsert: true, new: true }
				)
				.lean()
				.then(() => bot.sendMessage(chatId, `You are subscribed for import status.`))
		})
		.catch(bot.handleError.bind(bot, chatId));
});

bot.onText(/^\/import_unsubscribe_status$/, message => {
	let chatId = message.chat.id;
	let userId = message.from.id;
	bot.track(message, 'ImportStatsUnSubscribe');
	bot.sendChatAction(chatId, 'typing');
	return model
		.findOneAndUpdate(
			{ user: userId, chat: chatId, events: { $elemMatch: { $eq: events.IMPORT_STATUS } } },
			{ $pull: { events: events.IMPORT_STATUS } },
			{ new: true }
		)
		.lean()
		.then(result => {
			if (!result) {
				return bot.sendMessage(chatId, `You are wasn't subscribed for import status. Send /import_subscribe_status to subscribe.\n`);
			}
			return bot.sendMessage(chatId, `You are unsubscribed for import status.`);
		})
		.catch(bot.handleError.bind(bot, chatId));
});
