'use strict';

const Promise    = require('bluebird');
const model      = require('./model');
const Clans      = require('../../../v1/components/clans/model');
const Players    = require('../../../v1/components/players/model');
const VgMessages = require('../vg-messages/model');

function list(options) {
	options = options || {};

	var totalQuery = {};

	var query  = {
        deletedAt: { $exists: false }
    };

	var fields = {
		_id: 0,
		__v: 0,
		'players._id': 0
	};
	var sort  = options.sort || { date: -1 };
	var limit = 10;
	var skip   = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}
	
    const MAX_LIMIT = 10;
    
    if (options.limit) {
        var __limit = Number(options.limit);
        if (!isNaN(__limit) && (__limit > 0)) {
            limit = Math.min(MAX_LIMIT, __limit);
        }
    }

	var cursor = model
		.find(query)
		.select(fields)
		.populate([
			{
				path: 'players.player',
				select: { nickname: 1, 'progress.level': 1, _id: 0 }
			},
			{
				path: 'players.clan',
				select: { abbr: 1, _id: 0 }
			},
			{
				path: 'vg_message',
				select: { lang: 1, date: 1, forum: 1, topic: 1, post: 1, _id: 0 }
			}
		])
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	return Promise.props({
		data    : cursor
			.lean()
			.exec(),
		filtered: model.count(query),
		total   : model.count(totalQuery),
		skip    : skip,
		limit   : limit
	});
}

function informClans(postId, debug) {
    debug(`bans:claninform informing...`);
    
    return VgMessages
        .findOne({ post: postId }, { banlist: 1 })
        .populate('banlist')
        .lean()
        .then(message => {
            if (!message || !message.banlist || !message.banlist.players || !message.banlist.players.length) {
                return {};
            }
    
            return message.banlist.players.reduce((clansToInform, ban) => {
                let clan = ban.clan;
    
                if (clan) {
                    (clansToInform[clan] || (clansToInform[clan] = [])).push(ban.player);
                }
    
                return clansToInform;
            }, {});
        })
        .then(clansToInform => {
            let clans = Object.keys(clansToInform);
            
            if (!clans.length) {
                return Promise.resolve();
            }
            
            return Promise.all(clans.map(clan => {
                return Clans
                    .update({
                        _id: clan
                    }, {
                        $addToSet: { banned: { $each: clansToInform[clan] } }
                    })
                    .exec();
            }));
        })
        .then(() => debug(`bans:claninform informed.`));
}

function create(postId, debug) {
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
                .find({ nickname: { $in: possibles }, ban: { $exists: false } }, { 'progress.level': 1, nickname: 1, clan: 1 })
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
        .then(() => informClans(postId, debug));
}

exports.list = list;
exports.create = create;
exports.informClans = informClans;
