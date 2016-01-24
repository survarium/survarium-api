'use strict';

const debug = require('debug')('importer:matches');
const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const utils = require('../../lib/utils');
const config = require('../../../configs');
const notifications = require('../../services/telegram/triggers');
const Matches = require('./model');
const MatchesUnloaded = db.model('MatchesUnloaded');
const Maps = require('../maps/model');
const Stats = require('../stats/model');
const Players = require('../players/model');
const ClansImporter = require('../clans/importer');

const CACHEKEY = 'matches:load';
const CACHEIMPORTKEY = CACHEKEY + cache.options.suffix + ':last';
const EXPIRE = 60 * 1;
const logKey = 'match:';

var gracefulShutdown;

function tryToShutdown() {
	if (gracefulShutdown) {
		console.log(`executing ${process.pid} shutdown...`);
		return process.nextTick(function () {
			process.exit(0);
		});
	}
}

function saveStats(matchData, match) {
	debug(`saving stats for match ${match.id}`);
	var statsData = matchData.accounts;
	var createdStats = {};
	function saveStat(stat, player) {
		stat.player = player;
		createdStats[stat._id] = stat;
		return createdStats;
	}

	var promises = [0, 1].reduce(function (stats, teamNum) {
		var team = statsData[teamNum];
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
						var kills = +playerStats.kill || 0;
						var dies = +playerStats.die || 0;
						var document = {
							date : match.date,
							match: match._id,
							map  : match.map,
							player: player._id,
							team  : teamNum,
							level : match.level,
							kills : kills,
							dies  : dies,
							kd : +utils.kd(kills, dies),
							victory: !!+playerStats.victory,
							score  : +playerStats.score || 0,
							headshots: +playerStats.headshot_kill || 0,
							grenadeKills: +playerStats.grenade_kill || 0,
							meleeKills  : +playerStats.melee_kill || 0,
							artefactKills: +playerStats.artefact_kill || 0,
							pointCaptures: +playerStats.capture_a_point || 0,
							boxesBringed : +playerStats.bring_a_box || 0,
							artefactUses : +playerStats.use_artefact || 0
						};

						if (player.clan) {
							document.clan = player.clan;
						}

						return Stats
							.create(document)
							.tap(function (stat) {
								return saveStat(stat, player);
							})
							.tap(function (stat) {
								debug(`stats document for player ${player.nickname} and match ${match.id} created`);
								return player.addStat(stat);
							});
					});
			};
		}));
	}, []);

	/**
	 * PARALLEL WAY
	 */
	if (process.env.IMPORTER_II_PLAYERS) {
		return Promise
			.all(promises
				.map(function (promise) {
					return promise();
				}))
			.catch(function (err) {
				console.error(`${logKey} error happen while creating stat`, err);
			})
			.then(function () {
				return ClansImporter.clanwar({ match: match, stats: createdStats, matchData: matchData });
			})
			.then(function (clanwar) {
				return match
					.update({
						stats: Object.keys(createdStats),
						clanwar: clanwar
					})
					.exec()
					.then(function () {
						debug(`stats refs for match ${match.id} saved`);
						return match;
					});
			});
	}

	/**
	 * STACK WAY
	 */
	return new Promise(function (resolve, reject) {
		(function next() {
			var fn = promises.shift();
			if (!fn) {
				debug(`saving stats refs for match ${match.id}`);
				return ClansImporter.clanwar({ match: match, stats: createdStats, matchData: matchData })
				.then(function (clanwar) {
					return match
						.update({
							stats: Object.keys(createdStats),
							clanwar: clanwar
						})
						.exec()
						.then(function () {
							debug(`stats refs for match ${match.id} saved`);
							return resolve(match);
						});
				});
			}
			fn().tap(next).catch(reject);
		})();
	});
}

var lastImport;
var lastImportMatch;
var importInProgress;

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
				lastImport = match.date / 1000 >>> 0;
				return saveStats(statsData, match);
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
			date: (ts || 0) * 1000
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
				return { id: id, status: 'exists', match: match };
			}
			debug(`loading match ${id} from API`);
			return apiNative.getMatchStatistic({ id: id })
				.then(function (match) {
					if (!match) {
						debug(`match ${id} cannot be loaded from API`);
						return saveUnloaded(id, ts);
					}
					return saveMatch(match)
						.then(function (doc) {
							debug(`match ${id} imported`);
							return { id: id, status: 'added', match: doc };
						});
				});
		})
		/*.catch(function (err) {
			console.error(logKey, 'cannot import match', id, err);
			if (err.statusCode === 422) {
				debug(`match ${id} cannot be loaded from API`);
				return saveUnloaded(id, ts)
					.then(function () {
						return { id: id, status: 'no source', error: err };
					});
			}
			return { id: id, status: 'error', error: err };
		});*/
}

function loadByID(last) {
	var matchId = +last.id;
	console.log(`load at ${new Date()} from match=${matchId}`);
	var matchesToImport = +process.env.IMPORTER || 50;
	var matches = [];

	debug(`need to import ${matchesToImport} new matches`);

	return apiNative.getMaxMatchId({})
		.then(function (max) {
			var latestAvailable = +max.max_match_id.api - 25;
			var latestPossible = matchId + matchesToImport;
			var length = latestPossible > latestAvailable ?
				latestAvailable - matchId
				: matchesToImport;

			for (var i = 1; i <= length; i++) {
				matches.push(matchId + i);
			}

			return new Promise(function (resolve, reject) {
				var errors = [];
				var exit = function () {
					debug(`imported ${length} new matches`);
					if (!length || length < 0) {
						/**
						 * HEAD state, no fresh matches available yet
						 */
						tryToShutdown();
						return resolve();
					}
					/**
					 * Rollback last import date if amount of errors
					 * More than 10%
					 */
					if (length - errors.length < length * .1) {
						debug(`too many (${errors.length}) matches import errors in matches.`);
						let id = matches[0] || matchId;
						lastImportMatch = id;
						debug(`setting lastImport id=${lastImportMatch}`);
						cache.hmset(CACHEIMPORTKEY, 'id', id, 'ts', lastImport,'host', config.v1.telegram.hostname)
							.then(function () {
								let lastError = errors[errors.length - 1] || {};
								notifications.importStatus({
									type: 'tooMuchErrors',
									errors: errors.length,
									total: length,
									id: id,
									ts: lastImport,
									lastError: lastError.error,
									lastErrorMatch: lastError.id
								});
								tryToShutdown();
								return resolve();
							});
					}

					let id = matches[length - 1] || matchId;
					lastImportMatch = id;
					debug(`setting lastImport id=${id}`);
					return cache
						.hmset(CACHEIMPORTKEY, 'id', id, 'ts', lastImport, 'host', config.v1.telegram.hostname)
						.then(function () {
							tryToShutdown();
							/**
							 * If match list is full, load its remaining
							 */
							if (matchesToImport === length) {
								debug(`need to import next portion of new matches`);
								return loadByID({ id: id })
									.then(resolve)
									.catch(reject);
							}
							return resolve();
						})
						.catch(resolve);
				};

				if (process.env.IMPORTER_II_MATCHES) {
					/**
					 * PARALLEL WAY
					 */
					return Promise.all(matches.map(function (id) {
						var ts = process.hrtime();
						return importMatch(id)
							.tap(function (result) {
								ts = process.hrtime(ts);
								debug(`imported match ${id} with result ${result.status} in ${(ts[0] + ts[1] / 1e9).toFixed(2)}sec.`);
								console.log(`${logKey} ${id} ${result.status}`);
								if (result.status === 'error') {
									errors.push({ id: id, error: result.error })
								}
							})
							.catch(reject);
					})).then(exit).catch(reject);
				}

				/**
				 * STACK WAY
				 *
				 * Match import runner
				 * Each API operation must be delayed to fit max 5 req/sec.
				 *
				 * TODO: change lastImport to real match date
				 */
				var i = 0;
				var next = function () {
					var id = matches[i++];
					if (!id) {
						return exit();
					}
					var ts = process.hrtime();
					return importMatch(id)
						.tap(function (result) {
							ts = process.hrtime(ts);
							debug(`imported match ${id} with result ${result.status} in ${(ts[0] + ts[1] / 1e9).toFixed(2)}sec.`);
							console.log(logKey, id, result.status);
							if (result.status === 'error') {
								errors.push({ id: id, error: result.error })
							}
						})
						.then(next)
						.catch(reject);
				};
				return next();
			});
		});
}

/**
 * Load a pack of matches available from date
 * @param {Object} last
 * @param {Number} last.ts
 * @returns {Promise}
 */
function loadByTS(last) {
	var date = last.ts;
	var matchesToImport = +process.env.IMPORTER || 50;
	var offset = last.offset || 0;
	debug(`loading ${matchesToImport} matches at ${new Date()} from ts=${date} with offset ${offset} (${new Date(date * 1000)})`);
	/**
	 * Fetches list of matches available from date
	 */
	return apiNative.getNewMatches({ timestamp: date, limit: matchesToImport, offset: offset })
		.then(function (matches) {
			if (!matches.matches) {
				notifications.importStatus({
					type: 'noUpdates',
					ts: lastImport
				});
				let error = new Error(`no new matches available from ${date} (${new Date(date * 1000)})`);
				error.handled = true;
				throw error;
			}
			matches = matches.matches;
			var ids = Object.keys(matches);
			var length = ids.length;
			debug(`need to import ${length} new matches`);
			if (!length) {
				return null;
			}
			return new Promise(function (resolve, reject) {
				var errors = [];
				var i = 0;
				var exit = function () {
					debug(`imported ${length} new matches`);
					/**
					 * Rollback last import date if amount of errors
					 * More than 10%
					 */
					if (length - errors.length < length * .1) {
						debug(`too many (${errors.length}) matches import errors in matches.`);
						let id = ids[0];
						lastImport = matches[id];
						debug(`setting lastImport on ts=${lastImport} from id=${id}`);
						cache.hmset(CACHEIMPORTKEY, 'ts', lastImport, 'id', id, 'host', config.v1.telegram.hostname);
						let lastError = errors[errors.length - 1];
						notifications.importStatus({
							type: 'tooMuchErrors',
							errors: errors.length,
							total: length,
							ts: lastImport,
							lastError: lastError.error,
							lastErrorMatch: lastError.id
						});
						tryToShutdown();
						return resolve();
					}

					let id = ids[length - 1];
					lastImport = matches[id];
					debug(`setting lastImport on ts=${lastImport} from id=${id}`);
					return cache
						.hmset(CACHEIMPORTKEY, 'ts', lastImport, 'id', id, 'host', config.v1.telegram.hostname)
						.then(function () {
							tryToShutdown();
							/**
							 * If match list is full, load its remaining
							 */
							if (matchesToImport === length) {
								debug(`need to import next portion of new matches`);
								/**
								 * A lot of matches was imported at the single moment
								 */
								if (lastImport === matches[ids[0]]) {
									debug(`increasing offset for lastImport`);
									offset += matchesToImport;
								} else {
									offset = 0;
								}
								return loadByTS({ ts: lastImport, match: id, offset: offset })
									.then(resolve)
									.catch(reject);
							}
							return resolve();
						})
						.catch(resolve);
				};

				if (process.env.IMPORTER_II_MATCHES) {
					/**
					 * PARALLEL WAY
					 */
					return Promise.all(ids.map(function (id) {
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
							.catch(reject);
					})).then(exit).catch(reject);
				}

				/**
				 * STACK WAY
				 *
				 * Match import runner
				 * Each API operation must be delayed to fit max 5 req/sec.
				 *
				 * TODO: change lastImport to real match date
				 */
				var next = function () {
					//setTimeout(function () {
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
					//}, apiNative.delay);
				};
				return next();
			});
		});
}

var startOfTimes = {
	date: new Date(process.env.IMPORTER_START || '2015-04-30T21:08:03Z'),
	match: +process.env.IMPORTER_MATCH || 2253096
};

/**
 * Resolve timestamp of latest available match
 * @returns {Number}
 */
function getLastImport() {
	return (lastImport || lastImportMatch)?
		Promise.resolve({
			ts: lastImport,
			id: lastImportMatch
		}) :
		cache
			.hgetall(CACHEIMPORTKEY)
			.then(function (result) {
				if (result.ts && result.id) {
					lastImport = result.ts;
					lastImportMatch = result.id;
					return result;
				}
				return { ts: startOfTimes.date.getTime() / 1000 >>> 0, id: startOfTimes.match };
			});
}

/**
 * Import planner
 */
function loader() {
	debug(`[${process.pid}] (${new Date()}) trying to import new matches slice`);
	const cachekey = CACHEKEY + cache.options.suffix;
	return cache
		.get(cachekey)
		.then(function (loading) {
			if (loading) {
				debug(`[${process.pid}] cannot start new import: another import is running on process [${loading}]`);
				return;
			}
			importInProgress = true;
			return cache.set(cachekey, process.pid, 'EX', EXPIRE)
				.then(function () {
					return getLastImport()
						.tap(function (last) {
							console.log(`loader date ts=${last.ts} match=${last.id}`);
						})
						.then(loadByTS)
						.tap(cache.del.bind(cache, cachekey))
						.tap(function () {
							console.info(logKey, 'loaded');
						})
						.catch(function (err) {
							!err || !err.handled && notifications.importStatus({
								type: 'fatal',
								ts: lastImport,
								match: lastImportMatch,
								error: err
							});
							console.error(logKey, 'cannot make import', err);
						});
				})
				.catch(console.error.bind(console, logKey, 'cannot set cache status'));
		})
		.catch(console.error.bind(console, logKey, 'cannot get cache status'))
		.tap(function () {
			debug(`[${process.pid}] planning next import`);
			importInProgress = false;
			tryToShutdown();
			setTimeout(function () {
				debug(`[${process.pid}] starting planned import`);
				return loader();
			}, 1000 * (EXPIRE + 5));
		});
}

process.on('SIGTERM', function () {
	console.log(`register importer ${process.pid} shutdown...`);
	gracefulShutdown = true;

	if (!importInProgress) {
		tryToShutdown();
	}
});

if (config.v1.importer) {
	require('fs').writeFile(require('path').join(__dirname, '../../../../', 'importer.pid'), `${process.pid}\n`, function (err) {
		if (err) {
			throw err;
		}
		console.log(`importer PID: ${process.pid}`);
	});

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
	deblock: deblock,
	loader: loader,
	importMatch: importMatch
};
