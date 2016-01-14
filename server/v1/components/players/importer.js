'use strict';

const debug = require('debug')('importer:players');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const utils = require('../../lib/utils');
const Matches = db.model('Matches');
const Clans = db.model('Clans');
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

function assignDataToModel(source, update) {
	var data = source.data.userdata;
	var skills = source.skills.skills;

	var kills = +data.matches_stats.kills || 0;
	var dies = +data.matches_stats.dies || 0;
	var result = {
		progress: {
			elo: +data.progress.elo || 0,
			level: +data.progress.level || 0,
			experience: +data.progress.experience || 0
		},
		$set: {
			'total.matches': +data.matches_stats.matches || 0,
			'total.victories': +data.matches_stats.victories || 0,
			'total.kills': kills,
			'total.dies': dies,
			'total.kd': +utils.kd(kills, dies)
		},
		skills: Object.keys(skills).map(function (id) {
			return {
				id: Number(id),
				points: Number(skills[id])
			};
		})
	};

	if (!update) {
		result.id = source.data.pid;
		result.nickname = data.nickname;
	} else {
		if (data.nickname !== update.nickname) {
			result.nickname = data.nickname;
		}
	}

	return result;
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
		return Clans
			.load({
				id: clanId
			})
			.tap(function (clan) {
				return player.update({
					clan: clan._id,
					clan_meta: {
						id: clan.id,
						abbr: clan.abbr
					}
				}).exec();
			})
			.tap(function (clan) {
				debug(`clan ${clanId} assigned to player ${player.nickname}`);
				debug(`player ${player.nickname} will be added to clan ${clanId}`);
				return Clans
					.fetch({ id: clanId })
					.then(function (clanInfo) {
						var members = clanInfo.members.members;
						var keys = Object.keys(members);
						var role;
						keys.forEach(function (key) {
							var member = members[key];
							if (member.pid === player.id) {
								role = member.role_name;
							}
						});
						return clan
							.update({
								$pull: {
									players: {
										player: player._id
									}
								}
							})
							.exec()
							.then(function () {
								return clan.update({
									$push: {
										players: {
											player: player._id,
											role: role
										}
									}
								}).exec();
							})
							.tap(function () {
								debug(`player ${player.nickname} added to clan ${clanId} with role ${role}`);
							});
						});
			})
			.then(function () {
				debug(`clan ${clanId} assigned to player ${player.nickname}`);
				return player;
			});
	}
	if (!clanId && !isNew && player.clan) {
		debug(`current clan for ${player.nickname} will be removed`);
		return player
			.update({
				$unset: {
					clan: '',
					clan_meta: ''
				}
			})
			.exec()
			.then(function () {
				debug(`current clan for ${player.nickname} is removed`);
				return player;
			})
			.tap(function () {
				debug(`player will be removed from clan members`);
				return Clans.update({ _id: player.clan }, {
					$pull: {
						players: {
							player: player._id
						}
					}
				}).exec().tap(function () {
					debug(`player removed from clan members`);
				});
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
									.create(assignDataToModel(fetched))
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
								self.update({ id: id },  { $set: assignDataToModel(fetched, player) } ).exec()
									.then(function () {
										debug(`player ${id} updated`);
										return player;
									})
							)
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

module.exports = {
	load: load
};
