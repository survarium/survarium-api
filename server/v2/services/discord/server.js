'use strict';

var Discord = require('./index');
var debug = Discord.debug;
var Bans = require('./bans');

var config = require('../../../configs');
var PMCHANNELS = config.discord.pmChannels;

function setStatus(bot) {
	return bot
		.user.setStatus('online', 'Survarium', config.front)
		.catch(err => debug('bot:setStatus:err', err));
}

var pmChannels = [];
function getPM(bot) {
	let pms = PMCHANNELS;
	let botPMs = bot.channels.findAll('type', 'dm');

	pmChannels = botPMs
		.reduce((result, channel) => {
			if (pms.indexOf(channel.recipient.username) === -1) {
				return result;
			}

			result.push(channel);
			return result;
		}, []);
}

var bot = Discord.bot({
	onReady: function (bot) {
		setStatus(bot);
		getPM(bot);
	}
});

bot
	.on('message', message => {
		let author = message.author;
		let source;

		const isAdminMessage = PMCHANNELS.indexOf(author.username) > -1;

		if (isAdminMessage) {
			Bans.router(message);
			return;
		}

		if (bot.user.id === author.id) {
			return;
		} else if (message.channel.type === 'dm') {
			source = 'PM';
		} else if (message.mentions && message.mentions.length && message.mentions.filter(elem => elem.id === bot.user.id).length) {
			source = message.channel.name || message.channel.type;
		} else {
			return;
		}

		let txt = `<@${author.id}> [${source}]\n${message.content}`;

		Discord.sendMessage(pmChannels, txt);
	});

['debug', 'warn', 'messageDeleted', 'messageUpdated', 'disconnected','raw', 'serverCreated', 'serverDeleted', 'serverUpdated', 'channelCreated', 'channelDeleted', 'channelUpdated', 'serverRoleCreated', 'serverRoleDeleted', 'serverRoleUpdated', 'serverNewMember', 'serverMemberRemoved', 'serverMemberUpdated', 'presence', 'userTypingStarted', 'userTypingStopped', 'userBanned', 'userUnbanned', 'voiceJoin', 'voiceLeave', 'voiceStateUpdate']
	.forEach(event => bot
		.on(event, () => {
			debug(`bot:event:${event}`);
		}));
