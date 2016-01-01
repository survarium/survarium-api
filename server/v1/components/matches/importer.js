'use strict';

const debug = require('debug')('importer:matches');
const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const Matches = db.model('Matches');
const MatchesUnloaded = db.model('MatchesUnloaded');
const Maps = db.model('Maps');
const Stats = db.model('Stats');
const Players = db.model('Players');
const Clans = db.model('Clans');

const CACHEKEY = 'matches:load';
const CACHEIMPORTKEY = CACHEKEY + ':last';
const EXPIRE = 60 * .5;
const logKey = 'match:';

function saveStats(statsData, match) {
	debug(`saving stats for match ${match.id}`);
	var promises = [0, 1].reduce(function (stats, teamNum) {
		var team = statsData[teamNum + 1];
		if (!team) {
			return stats;
		}
		return stats.concat(Object.keys(team).map(function (key) {
			var playerStats = team[key];
			return function () {
				return Players
					.load({ id: playerStats.pid })
					.then(function (player) {
						debug(`player ${playerStats.pid} ${player.nickname} loaded`);
						debug(`creating stats document for player ${player.nickname} and match ${match.id}`);
						var document = {
							date : match.date,
							match: match._id,
							map  : match.map,
							player: player._id,
							team  : teamNum,
							level : match.level,
							kills : playerStats.kill,
							dies  : playerStats.die,
							victory: !!+playerStats.victory,
							score  : playerStats.score,
							headshots: playerStats.headshot_kill,
							grenadeKills: playerStats.grenade_kill,
							meleeKills  : playerStats.melee_kill,
							artefactKills: playerStats.artefact_kill,
							pointCaptures: playerStats.capture_a_point,
							boxesBringed : playerStats.bring_a_box,
							artefactUses : playerStats.use_artefact
						};
						if (player.clan) {
							document.clan = player.clan;
						}

						return Stats
							.create(document)
							.tap(function (stat) {
								debug(`stats document for player ${player.nickname} and match ${match.id} created`);
								return player.addStat(stat);
							});
					});
			};
		}));
	}, []);
	return new Promise(function (resolve, reject) {
		var statIds = [];
		function saveStatId(stat) {
			return statIds.push(stat._id);
		}
		(function next() {
			var fn = promises.shift();
			if (!fn) {
				debug(`saving stats refs for match ${match.id}`);
				return match.update({
					stats: statIds
				}).exec().then(function () {
					debug(`stats refs for match ${match.id} saved`);
					return resolve(match);
				});
			}
			fn().tap(saveStatId).tap(next).catch(reject);
		})();
	});
}

/**
 * Match document creator
 * And related models fill trigger
 * @param {Object} data     Match data from API
 * @returns {Object|Promise}
 */
function saveMatch(data) {
	var id = data.match_id;
	var statsData = data.stats;
	debug(`saving match ${id}`);
	return Promise.props({
		map: Maps.findOne({ id: Number(statsData.map_id) }).lean()
	})
	.then(function (result) {
		var map = result.map;
		if (!map) {
			debug(`cannot load map for match ${id}`);
			throw new Error(`no map ${statsData.map_id} found`);
		}

		debug(`creating document for match ${id}`);
		return Matches
			.create({
				id: data.match_id,
				date: new Date(statsData.time_start.replace(/\s/, 'T')),
				duration: statsData.game_duration,
				server: statsData.server_id,
				replay: statsData.replay_path === '' ? undefined : statsData.replay_path,
				level: statsData.match_level,
				score: [0, 1].map(function (teamNum) {
					return statsData[`team_${teamNum + 1}_score`];
				}).filter(Boolean).map(Number),
				map: map._id
			})
			.tap(function (match) {
				debug(`document for match ${id} created`);
				return saveStats(statsData.accounts, match);
			});
	});
}

/**
 * Store failed match import
 * @param {Number} id   Match ID
 * @param {Number} ts   Match timestamp
 * @returns {Object|Promise}
 */
function saveUnloaded(id, ts) {
	debug(`adding unloaded match ${id}`);
	return MatchesUnloaded
		.findOrCreate({
			id: id,
			date: ts * 1000
		})
		.then(function () {
			debug(`unloaded match ${id} added`);
			return { id: id, status: 'no-data' };
		})
		.catch(console.error.bind(console, logKey, 'cannot add unloaded match'));
}

/**
 * Match status checker and API data fetcher
 * @param {Number} id   Match ID
 * @param {Number} ts   Match timestamp
 * @returns {Object|Promise}
 */
function importMatch(id, ts) {
	debug(`importing match ${id}`);
	return Matches
		.findOne({ id: id })
		.then(function (match) {
			if (match) {
				debug(`match ${id} exists`);
				return { id: id, status: 'exists' };
			}
			debug(`loading match ${id} from API`);
			return apiNative.getMatchStatistic({ id: id }, { delay: apiNative.delay })
				.then(function (match) {
					if (!match) {
						debug(`match ${id} cannot be loaded from API`);
						return saveUnloaded(id, ts);
					}
					return saveMatch(match)
						.then(function () {
							debug(`match ${id} imported`);
							return { id: id, status: 'added' };
						});
				});
		})
		.catch(function (err) {
			console.error(logKey, 'cannot import match', id, err);
			if (err.statusCode === 422) {
				debug(`match ${id} cannot be loaded from API`);
				return saveUnloaded(id, ts)
					.then(function () {
						return { id: id, status: 'no source', error: err };
					});
			}
			return { id: id, status: 'error', error: err };
		});
}

var lastImport;
cache
	.get(CACHEIMPORTKEY)
	.then(function (ts) {
		return lastImport = ts;
	});

/**
 * Load a pack of matches available from date
 * @param {Number} date
 * @returns {Promise}
 */
function load(date) {
	console.log(`load at ${new Date()} from ts=${date} (${new Date(date * 1000)})`);
	var matchesToImport = 30;
	/**
	 * Fetches list of matches available from date
	 */
	return apiNative.getNewMatches({ timestamp: date, limit: matchesToImport }, { delay: apiNative.delay })
		.then(function (matches) {
			matches = matches.matches;
			var ids = Object.keys(matches);
			var length = ids.length;
			debug(`need to import ${length} new matches`);
			if (!length) {
				return null;
			}
			return new Promise(function (resolve, reject) {
				var errors = [];
				var exit = function () {
					debug(`imported ${length} new matches`);
					/**
					 * Rollback last import date if amount of errors
					 * More than 10%
					 */
					if (length - errors.length < length * .1) {
						debug(`too many (${errors.length}) matches import errors in matches`);
						lastImport = matches[ids[0]];
						return resolve();
					}
					cache.set(CACHEIMPORTKEY, lastImport);
					/**
					 * If match list is full, load its remaining
					 */
					if (matchesToImport === length) {
						debug(`need to import next portion of new matches`);
						return load(lastImport)
							.then(resolve)
							.catch(reject);
					}
					return resolve();
				};

				var i = 0;
				/**
				 * Match import runner
				 * Each API operation must be delayed to fit max 5 req/sec.
				 */
				var next = function () {
					setTimeout(function () {
						var id = ids[i++];
						if (!id) {
							return exit();
						}
						var ts = process.hrtime();
						return importMatch(id, matches[id])
							.tap(function (result) {
								ts = process.hrtime(ts);
								debug(`imported match ${id} with result ${result.status} in ${(ts[0] + ts[1] / 1e9).toFixed(2)}sec.`);
								console.log(logKey, id, result.status, new Date(matches[id] * 1000));
								lastImport = matches[id];
								if (result.status === 'error') {
									errors.push({ id: id, error: result.error })
								}
							})
							.then(next)
							.catch(reject);
					}, apiNative.delay);
				};
				return next();
			});
		});
}

var startOfTimes = {
	date: new Date('2015-04-30T21:08:03Z'),
	match: 2253096
};

/**
 * Resolve timestamp of latest available match
 * @returns {Number}
 */
function getLastImport() {
	return lastImport ? Promise.resolve(lastImport) : Matches.findOne({}, 'date')
	.sort({ id: -1 })
	.lean()
	.then(function (result) {
		var date = result ? result.date : startOfTimes.date;
		return date.getTime() / 1000 >>> 0;
	})
}

/**
 * Import planner
 */
function loader() {
	debug(`[${process.pid}] (${new Date()}) trying to import new matches slice`);
	const cachekey = CACHEKEY;
	return cache
		.get(cachekey)
		.then(function (loading) {
			if (loading) {
				debug(`[${process.pid}] cannot start new import: another import is running on process [${loading}]`);
				return;
			}
			return cache.set(cachekey, process.pid, 'EX', EXPIRE)
				.then(function () {
					return getLastImport()
						.tap(function (date) {
							console.log('loader date', date);
						})
						.then(load)
						.tap(cache.del.bind(cache, cachekey))
						.tap(function () {
							console.info(logKey, 'loaded');
						})
						.catch(function (err) {
							console.error(logKey, 'cannot make import', err);
						});
				})
				.catch(console.error.bind(console, logKey, 'cannot set cache status'));
		})
		.catch(console.error.bind(console, logKey, 'cannot get cache status'))
		.tap(function () {
			debug(`[${process.pid}] planning next import`);
			setTimeout(function () {
				debug(`[${process.pid}] starting planned import`);
				return loader();
			}, 1000 * (EXPIRE + 10));
		});
}

if (process.env.IMPORTER) {
	setTimeout(loader, (Math.random() * 30000) >>> 0);
}

/**
 * Remove loader stoppers
 * @returns {Promise}
 */
function deblock() {
	return cache.multi().del(CACHEKEY).exec().then(function () {
		console.info(logKey, 'cache cleaned');
	});
}

if (process.env.DEBLOCK) {
	deblock();
}

module.exports = {
	deblock: deblock
};
