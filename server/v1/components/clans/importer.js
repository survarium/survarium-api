'use strict';

const debug = require('debug')('importer:clans');
const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const model = require('./model');
const Stats = require('../stats/model');
const utils    = require('../../lib/utils');

const CACHEKEY = 'clans:load';
const EXPIRE = 60 * 5;
const logKey = 'clans:';

/**
 * Fetch data from API
 * Cacheable
 * @param {Object}  params
 * @param {Number}  params.id  Clan ID
 * @returns {Object|Promise}
 */
function fetch(params) {
	debug(`loading clan ${params.id} from source`);
	var key = `${CACHEKEY}:${params.id}`;
	return cache.get(key)
		.then(function (clanInfo) {
			if (!clanInfo) {
				return Promise.props({
						clan: apiNative.getClanInfo({ id: params.id }),
						members: apiNative.getClanMembers({ id: params.id })
					})
					.tap(function (clanInfo) {
						debug(`clan ${params.id} loaded from API`);
						return cache.set(key, JSON.stringify(clanInfo), 'EX', EXPIRE);
					});
			}
			debug(`clan ${params.id} loaded from cache`);
			return JSON.parse(clanInfo);
		});
}

/**
 * Map API data to database model schema
 * @param {Object} source   API data
 * @param {Object} [update] Document if exists
 * @returns {Object}
 */
function assignDataToModel(source, update) {
	var data = source.clan.clan_info;
	var result = {
		name: data.name,
		level: data.level,
		elo: data.elo
	};
	if (!update) {
		result.id = source.clan.clan_id;
		result.abbr = data.abbreviation;
		result.foundation = new Date(data.creation_time.replace(/\s/, 'T'));
	} else {
		if (update.abbr !== data.abbreviation) {
			result.abbr = data.abbreviation;
		}
		if (!update.foundation) {
			result.foundation = new Date(data.creation_time.replace(/\s/, 'T'));
		}
	}
	return result;
}

/**
 * Return clan from database
 * Created or updated from API if needed
 * @param {Object}  params
 * @param {Number}  params.id  Clan ID
 * @returns {Object|Promise}
 */
function load(params) {
	debug(`load ${params.id}`);

	var id = params.id;
	return model
		.findOne({ id: id })
		.then(function (clan) {
			if (!clan || ((new Date()).getTime() - clan.updatedAt.getTime() > EXPIRE * 1000)) {
				var isNew = !clan;
				debug(`clan ${id} being ${isNew ? 'created' : 'updated'}`);
				return fetch(params)
					.then(function (fetched) {
						return isNew ?
							model
								.create(assignDataToModel(fetched))
								.catch(function (err) {
									if (err.code === 11000) {
										debug(`clan ${id} should be created, but its already exists`);
										return model.findOne({ id: id });
									}
									throw err;
								}):
							model
								.update({ id: id }, { $set: assignDataToModel(fetched, clan) })
								.exec()
								.then(function () {
									return clan;
								});
					});
			}
			debug(`clan ${id} is fresh`);
			return clan;
		});
}

function teamWin(stat) {
	return stat.victory ? stat.team :
		stat.team ? 0 : 1;
}

function publicStat (id, stat) {
	return model
		.findOneAndUpdate({ _id: id }, {
			$push: {
				stats: stat._id
			},
			$inc: {
				'totalPublic.matches': 1,
				'totalPublic.victories': stat.victory ? 1 : 0,
				'totalPublic.kills': stat.kills || 0,
				'totalPublic.dies': stat.dies || 0,

				'totalPublic.headshots': stat.headshots || 0,
				'totalPublic.grenadeKills': stat.grenadeKills || 0,
				'totalPublic.meleeKills': stat.meleeKills || 0,
				'totalPublic.artefactKills': stat.artefactKills || 0,
				'totalPublic.pointCaptures': stat.pointCaptures || 0,
				'totalPublic.boxesBringed': stat.boxesBringed || 0,
				'totalPublic.artefactUses': stat.artefactUses || 0,

				'totalPublic.score': stat.score || 0
			}
		}, { new: true, fields: { abbr: 1, totalPublic: 1 } })
		.then(function (clan) {
			clan.set('totalPublic.winRate', ((+clan.totalPublic.victories || 0) / (+clan.totalPublic.matches || 0) * 100) || 0);
			clan.set('totalPublic.scoreAvg', +((clan.totalPublic.score || 0) / (clan.totalPublic.matches)).toFixed(0));
			clan.set('totalPublic.kd', +utils.kd(clan.totalPublic.kills, clan.totalPublic.dies));
			return clan.save().then(function (clan) {
				debug(`added publicStat for clan ${clan.abbr}`);
				return clan;
			});
		});
}

function matchStat(allStats, team, win, clan) {
	var keys = Object.keys(allStats);
	var statUpdates = [];
	var $inc = keys.reduce(function  (inc, key) {
		var stat = allStats[key];
		if (stat.team !== team) {
			return inc;
		}
		statUpdates.push(stat._id);
		inc['total.kills'] += stat.kills || 0;
		inc['total.dies'] += stat.dies || 0;
		inc['total.headshots'] += stat.headshots || 0;
		inc['total.grenadeKills'] += stat.grenadeKills || 0;
		inc['total.meleeKills'] += stat.meleeKills || 0;
		inc['total.artefactKills'] += stat.artefactKills || 0;
		inc['total.pointCaptures'] += stat.pointCaptures || 0;
		inc['total.boxesBringed'] += stat.boxesBringed || 0;
		inc['total.artefactUses'] += stat.artefactUses || 0;
		inc['total.score'] += stat.score || 0;
		return inc;
	}, {
		'total.matches': 1,
		'total.victories': win ? 1: 0,
		'total.kills': 0,
		'total.dies': 0,
		'total.headshots': 0,
		'total.grenadeKills': 0,
		'total.meleeKills': 0,
		'total.artefactKills': 0,
		'total.pointCaptures': 0,
		'total.boxesBringed': 0,
		'total.artefactUses': 0,
		'total.score': 0
	});

	if ($inc['total.score'] === 0) {
		return Promise.resolve(undefined);
	}

	var $set = {
		'total.scoreAvg': +(((clan.total.score + $inc['total.score']) || 0) / (clan.total.matches + 1)).toFixed(0),
		'total.winRate': (((+clan.total.victories + $inc['total.victories']) || 0) / ((+clan.total.matches + 1) || 0) * 100) || 0,
		'total.kd': +utils.kd(clan.total.kills + $inc['total.kills'], clan.total.dies + $inc['total.dies'])
	};

	return Stats.update({ _id: { $in: statUpdates }}, { $set: { clanwar: true } }, { multi: true }).then(function () {
		return { $inc: $inc, $set: $set };
	});
}

/**
 * @param {Object} params
 * @param {Object} params.match     mongo-match
 * @param {Object} params.stats     mongo-stats
 * @param {Object} params.matchData match from API
 * @returns {Promise.<boolean>}
 */
function clanwar(params) {
	if (~['1', 'true'].indexOf(process.env.IMPORTER_NOCW)) {
		return Promise.resolve(undefined);
	}
	var matchData = params.matchData;
	var match = params.match;
	var stats = params.stats;

	if (!matchData.is_clan || !matchData.clan_match) {
		debug(`match ${match.id} is not a clanwar`);
		return Promise.resolve(undefined);
	}

	debug(`match ${match.id} is a clanwar`);

	var statsKeys = Object.keys(stats);
	var clanKeys = {};

	var clans = Object.keys(matchData.clan_match).map(function (num) {
		clanKeys[matchData.clan_match[num]] = +num;
		return matchData.clan_match[num];
	});

	var win = teamWin(stats[statsKeys[0]]);

	return model
		.find({ id: {
			$in: clans
		}}, { _id: 1, id: 1, abbr: 1, total: 1 })
		.then(function (clanData) {
			debug(`assigning clanwar ${match.id} to its clans`);
			return Promise
				.all(clanData.map(function (clan) {
					var victory = win === clanKeys[clan.id];
					return matchStat(stats, clanKeys[clan.id], victory, clan)
					.then(function (updaters) {
						if (!updaters) {
							debug(`cannot assign empty stat for clan ${clan.abbr} in clanwar ${match.id}`);
							throw new Error('empty team score');
						}
						var inc = updaters.$inc;
						return clan
							.update({ $push: { matches: match._id }, $inc: inc, $set: updaters.$set })
							.exec()
							.then(function () {
								return {
									clan: clan._id,
									win: victory,
									total: Object.keys(inc).reduce(function (total, key) {
										total[key.replace('total.', '')] = inc[key];
										return total;
									}, {})
								};
							});
					})
				}))
				.then(function (clanwar) {
					debug(`clanwar ${match.id} assigned to its clans`);
					return clanwar;
				})
				.catch(function (err) {
					if (err.message === 'empty team score') {
						return;
					}
					throw err;
				});
		});
}

module.exports = {
	load: load,
	fetch: fetch,
	clanwar: clanwar,
	publicStat: publicStat,
	model: model
};
