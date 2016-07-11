'use strict';

const model      = require('../../components/bans/model');
const Players    = require('../../../v1/components/players/model');
const VgMessages = require('../../components/vg-messages/model');
const Discord    = require('./index');
const debug      = Discord.debug;

function router (message) {
    debug('bans:router');

	let match = message.content.match(/^Banlist (\d+)( (revoke))?/i);
	let postId = match && match[1];
	if (!postId) {
		return;
	}

	let post;
	let ban;
	return VgMessages
		.findOne({ post: postId }, { text: 1, date: 1, banlist: 1 })
		.then(elem => {
			if (!elem) {
				throw new Error(`No vg-message ${postId} found`);
			}
			if (elem.banlist) {
				throw new Error(`Vg-message ${postId} is banlist already`);
			}

			debug(`bans:loaded message ${postId}`);

			post = elem;
			return post.text.match(/(<br>)([^\<\>]{2,})/gm).map(elem => elem.replace('<br>', '').trim()).filter(elem => elem.length > 0);
		})
		.then(possibles => {
			debug(`bans:possibles ${possibles.length}`);

			return Players
				.find({ nickname: { $in: possibles }, ban: { $exists: 0 } }, { 'progress.level': 1, nickname: 1, clan: 1 })
				.exec();
		})
		.then(players => {
			if (!players || !players.length) {
				throw new Error(`No cheaters found for post ${postId}`);
			}

			debug(`bans:creating banlist for ${players.length} cheaters`);

			return model
				.create({
					date: post.date,
					vg_message: post._id
				})
				.then(banlist => {
					debug(`bans:banlist created`);
					banlist.players = players.map(player => {
						let result = { player: player._id };
						player.clan && (result.clan = player.clan);
						return result;
					});

					return banlist.save();
				})
				.then(banlist => {
					ban = banlist;
					return Players
						.update(
							{
							_id: { $in: players.map(player => player._id) }
							},
							{
								$set: {
									banned: true,
									ban: banlist._id
								}
							},
							{
								multi: true
							}
						)
						.exec();
				})
				.then(() => {
					debug(`bans:cheaters banned`);
					post.banlist = ban._id;
					return post.save();
				});
		})
		.then(() => Discord.sendMessage([message.channel], `Banlist created`))
		.catch(err => Discord.sendMessage([message.channel], err));
}

exports.router = router;
