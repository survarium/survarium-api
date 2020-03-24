'use strict';

const debug = require('debug')('importer:players');
const apiNative = require('../../lib/api-native');
const config = require('../../../configs');
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

const langDefault = config.api.langDefault;

function fetch(params) {
	debug(`loading player ${params.id} from source`);
	var key = `${CACHEKEY}:${params.id}`;
	return cache.get(key)
		.then(function (player) {
			if (!player) {
				return Promise
					.props({
						data: apiNative.getUserData({ pid: params.id, language: langDefault }),
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

/**
 * TODO: remove Player.ammunition.mods field
 * TODO: update its model
 * TODO: update its loader
 * @param modification_ids
 */
function parseAmmunitionMod(modification_ids) {
	if (!modification_ids) {
		return;
	}

	return;
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
						mods: parseAmmunitionMod(item.modification_ids)
					};
				})
		};
	}

	return Object.keys(ammunition).reduce(function (result, profile) {
		result.push(assignProfile(profile));
		return result;
	}, []);
}

function assignDataToModel(source, update, { duplicate } = {}) {
	var data = source.data.userdata;
	var skills = source.skills.skills;
	// newbie players exports with `progress: false`
	var progress = Object.assign({ '': {} }, data.progress);

	var kills = +data.matches_stats.kills || 0;
	var dies = +data.matches_stats.dies || 0;
	var $set = {
		'progress.level': +progress.level || 0,
		'progress.experience': +progress.experience || 0,
		'progress.elo-random': +progress[''].random || 0,
		'progress.elo-rating': +progress[''].rating || 0,

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

	function storePreviousNickname(previous, conflict) {
		($update.$push || ($update.$push = {}))['nicknames'] = {
			nickname: previous,
			until   : Date.now(),
			conflict
		};
	}

	if (!update) {
		$set.id = source.data.pid;
		$set.nickname = data.nickname;
	} else {
		if (data.nickname !== update.nickname) {
			storePreviousNickname(update.nickname, false);
			$set.nickname = data.nickname;
		}
	}

	if ($set.nickname && duplicate) {
		debug(`resetting duplicate nickname ${$set.nickname} to pid ${source.data.pid}`);
		storePreviousNickname($set.nickname, true);
		$set.nickname = source.data.pid;
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
function assignClan(params, player = {}) {
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

const MAX_DUPLICATE_CONFLICTS = 2;

function existingPlayerConflict(fetched, params, err) {
	const self = this;

	if (err.code === 11000 && err.message && err.message.match(/index: nickname/)) {
		const conflictedNickname = fetched.data.userdata.nickname;

		params.conflicts = (params.conflicts || 0) + 1;

		if (params.conflicts <= MAX_DUPLICATE_CONFLICTS) {
			debug(`trying to update duplicate for id ${params.id} with nickname ${conflictedNickname}`);

			return self
				.findOne({ nickname: conflictedNickname }, { id: 1 })
				.then(function playerConflictedOk(conflicted) {
					if (!conflicted) {
						debug(`cannot find player duplicate by nickname ${conflictedNickname}`);
						return;
					}

					return load
						.call(self, { id: conflicted.id, conflicts: params.conflicts });
				})
				.then(function ({ id } = {}) {
					debug(`duplicate updated for ${conflictedNickname} with id ${id}`);

					return load
						.call(self, params);
				});
		} else {
			debug(`cannot resolve duplicate for id ${params.id} with nickname ${conflictedNickname} in ${params.conflicts} tries`);
		}
	}

	throw err;
}

function load(params) {
	const { id, conflicts = 0 } = params;
	const self = this;

	debug(`loading player ${id}`);

    return self
		.findOne({ id })
		.then(function playerToUpdate(player) {
			const isNew = !player;
			const isExpired = player && (new Date()).getTime() - player.updatedAt.getTime() > EXPIRE * 1000;
			const isDuplicate = conflicts === MAX_DUPLICATE_CONFLICTS;

			if (isNew || isExpired || isDuplicate) {
				return fetch(params)
					.then(function playerFromSource(fetched) {
						debug(`player ${id} will be ${isNew ? 'created' : 'updated'}`);
						return (isNew ?
								self
									.create(assignDataToModel(fetched, undefined, { duplicate: isDuplicate }).$set)
									.tap(function () {
										debug(`player ${id} created`);
									})
									.catch(function playerCreatorError(err) {
										if (err.code === 11000) {
											debug(`player ${id} should be created, but its already exists. ${err.message}`);
											return self.findOne({ id: id })
												.then(existingPlayer =>
													existingPlayer ?
														existingPlayer :
														existingPlayerConflict.call(self, fetched, params, err)
												);
										}

										throw err;
									}):
								self.update({ id: id }, assignDataToModel(fetched, player, { duplicate: isDuplicate }))
                                    .exec()
									.then(function playerUpdaterOk() {
										debug(`player ${id} updated`);
										return player;
									})
                                    .catch(existingPlayerConflict.bind(self, fetched, params))
							)
                            // .tap(ItemsUsage.bind({ debug: debug }))
							.then(assignClan.bind(null, { isNew: isNew, source: fetched }));
					})
					.then(function playerAfterUpdate(player) {
						return self.findOne({ _id: player._id });
					});
			}
			debug(`loaded fresh player ${id}`);
			return player;
		})
		.catch(err => {
			throw new Error(`cannot load player id ${id} with ${conflicts} conflicts and error ${err.message || err}`);
		});
}

/*setTimeout(function () {
	// Import test
	load.call(db.model('Players'), { id: '10138467795994661623' }).then(function (player) {
		console.log('ok')//player);
	});
}, 1000);*/

module.exports = {
	load: load
};
