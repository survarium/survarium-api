'use strict';

const bans    = require('../../components/bans/ctl');
const Discord = require('./index');
const debug   = Discord.debug;

function router(message) {
    debug('bans:router');

	let match = message.content.match(/^Banlist (\d+)( (revoke|claninform))?/i);
	let postId = match && match[1];
	if (!postId) {
		return Discord.sendMessage([message.channel], `You say: ${message.content}`)
            .catch(err => console.error(err.stack));
	}
	
	if (match[2] === 'claninform') {
	    return bans.informClans(postId, debug)
            .then(() => Discord.sendMessage([message.channel], `Clan informed`))
            .catch(err => Discord.sendMessage([message.channel], err));
    }

	return bans.create(postId, debug)
		.then(() => Discord.sendMessage([message.channel], `Banlist created`))
		.catch(err => Discord.sendMessage([message.channel], err));
}

exports.router = router;
