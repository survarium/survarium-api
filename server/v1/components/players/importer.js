'use strict';

const debug = require('debug')('importer:players');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const utils = require('../../lib/utils');
const Matches = db.model('Matches');
const ClansImporter = require('../clans/importer');
const ItemsUsage = require('../../../v2/components/game/importer/items').assignAmmunitionUsage;
const Promise = require('bluebird');

const CACHEKEY = 'players:load';
const EXPIRE = 60 * 5;
const logKey = 'player:';

function fetch(params) {
	debug(`loading player ${params.id} from source`);
	var key = `${CACHEKEY}:${params.id}`;
	return cache.get(key)
		.then(function (player) {
			if (!player) {
				return Promise
					.props({
						data: apiNative.getUserData({ pid: params.id }),
					    skills: apiNative.getUserSkills({ pid: params.id })
					})
					.tap(function (user) {
						debug(`player ${params.id} loaded from API`);
						return cache.set(key, JSON.stringify(user), 'EX', EXPIRE);
					});
			}
			debug(`player ${params.id} loaded from cache`);
			return JSON.parse(player);
		});
}

function assignAmmunition(ammunition) {
	function assignProfile(profile) {
		var dataset = ammunition[profile];

		return {
			profile: +profile,
			active: !!dataset.active,
			items: Object
				.keys(dataset)
				.filter(function (key) {
					return key.match(/^\d+$/);
				})
				.map(function (key) {
					var item = dataset[key];
					return {
						item: +item.item_id,
						slot: +item.slot_id,
						amount: +item.amount,
						mods: item.modification_ids ? item.modification_ids.split(',').map(Number) : undefined
					};
				})
		};
	}

	return Object.keys(ammunition).reduce(function (result, profile) {
		result.push(assignProfile(profile));
		return result;
	}, []);
}

function assignDataToModel(source, update) {
	var data = source.data.userdata;
	var skills = source.skills.skills;

	var kills = +data.matches_stats.kills || 0;
	var dies = +data.matches_stats.dies || 0;
	var $set = {
		'progress.elo': +data.progress.elo || 0,
		'progress.level': +data.progress.level || 0,
		'progress.experience': +data.progress.experience || 0,

		'total.matches': +data.matches_stats.matches || 0,
		'total.victories': +data.matches_stats.victories || 0,
		'total.kills': kills,
		'total.dies': dies,
		'total.kd': +utils.kd(kills, dies),
		'total.winRate': ((+data.matches_stats.victories || 0) / (+data.matches_stats.matches || 0) * 100) || 0,

		skills: Object.keys(skills).map(function (id) {
			return {
				id: Number(id),
				points: Number(skills[id])
			};
		}),

		ammunition: assignAmmunition(data.ammunition)
	};

	var $update = { $set };

	if (!update) {
		$set.id = source.data.pid;
		$set.nickname = data.nickname;
	} else {
		if (data.nickname !== update.nickname) {
			($update.$push || ($update.$push = {}))['nicknames'] = {
				nickname: update.nickname,
				until   : Date.now()
			};
			$set.nickname = data.nickname;
		}
	}

	return $update;
}

/**
 * Assign clan to player
 * @param {Object}  params          data for assignment
 * @param {Boolean} params.isNew    is player created or updated
 * @param {Object}  params.source   player data from API
 * @param {Object}  player          player document
 * @returns {Object} player
 */
function assignClan(params, player) {
	var isNew = params.isNew;
	var clanId = params.source.data.userdata.clan_id;
	debug(`assigning clan ${clanId} to player ${player.nickname}`);
	if (!clanId && isNew) {
		debug(`clan ${clanId} is not assigned to new player ${player.nickname}`);
		return player;
	}
	if (clanId) {
		debug(`clan ${clanId} will be assigned to player ${player.nickname}`);
		return ClansImporter
			.load({
				id: clanId
			})
			.tap(function (clan) {
				return player.attachClan(clan);
			})
			.tap(function (clan) {
				return ClansImporter.attachClan(clan, player);
			})
			.then(function () {
				debug(`clan ${clanId} assigned to player ${player.nickname}`);
				return player;
			});
	}
	if (!clanId && !isNew && player.clan) {
		debug(`current clan for ${player.nickname} will be removed`);
		return player.detachClan()
			.tap(ClansImporter.detachClan)
			.then(function () {
				debug(`current clan for ${player.nickname} is removed`);
				return player;
			});
	}
	debug(`clan ${clanId} is not assigned to player ${player.nickname}`);
	return player;
}

function load(params) {
	var id = params.id;
	var self = this;
	debug(`loading player ${id}`);
	return self
		.findOne({ id: id })
		.then(function (player) {
			if (!player || ((new Date()).getTime() - player.updatedAt.getTime() > EXPIRE * 1000)) {
				var isNew = !player;
				return fetch(params)
					.then(function (fetched) {
						debug(`player ${id} will be ${isNew ? 'created' : 'updated'}`);
						return (isNew ?
								self
									.create(assignDataToModel(fetched).$set)
									.tap(function () {
										debug(`player ${id} created`);
									})
									.catch(function (err) {
										if (err.code === 11000) {
											debug(`player ${id} should be created, but its already exists`);
											return self.findOne({ id: id });
										}
										throw err;
									}):
								self.update({ id: id },  assignDataToModel(fetched, player))
                                    .exec()
									.then(function () {
										debug(`player ${id} updated`);
										return player;
									})
							)
                            .tap(ItemsUsage.bind({ debug: debug }))
							.then(assignClan.bind(null, { isNew: isNew, source: fetched }));
					})
					.then(function (player) {
						return self.findOne({ _id: player._id });
					});
			}
			debug(`loaded fresh player ${id}`);
			return player;
		});
}

/*setTimeout(function () {
	// Import test
	load.call(db.model('Players'), { id: '15238791817735151910' }).then(function (player) {
		console.log('ok')//player);
	});
}, 1000);*/

module.exports = {
	load: load
};
