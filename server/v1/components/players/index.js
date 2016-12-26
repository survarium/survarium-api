'use strict';

const Promise = require('bluebird');
const router  = require('express').Router();
const model   = require('./model');
const config  = require('../../../configs');
const libLang = require('../../lib/lang');
const front   = config.front;

function getData(options) {
	options = options || {};

	var sortBy = {
		id: 'id',
		kd: 'total.kd',
		exp: 'progress.experience',
		kill: 'total.kills',
		die: 'total.dies',
		win: 'total.victories',
		match: 'total.matches',
		scoreAvg: 'total.scoreAvg',
		winrate: 'total.winRate',
		hs: 'total.headshots',
		gk: 'total.grenadeKills',
		mk: 'total.meleeKills',
		ak: 'total.artefactKills',
		cap: 'total.pointCaptures',
		box: 'total.boxesBringed',
		au: 'total.artefactUses'
	}[options.sortBy] || 'progress.experience';
	var sort = {};
	sort[sortBy] = options.sort === 'asc' ? 1 : -1;

	var stats = options.stats !== undefined ? (Math.abs(Number(options.stats)) || 0) : 25;

	var find  = options.search || {};
	var defaultSearch = options.noexclude ? {} : {
		'total.stats': { $gt: 20 },
		'total.matches': { $gt: 100 }
	};

	Object.assign(find, defaultSearch);

	var query = model
		.find(find, `-_id ${!stats ? '-stats' : ''} -__v -clan_meta -skills -ammunition -createdAt -updatedAt -total.score -total.stats`);

	query = query.sort(sort)
		.skip(Math.abs(Number(options.skip)) || 0)
		.limit(Math.min(Math.abs(Number(options.limit)) || 25, 150));

	query = query.populate({
		path: 'clan',
		select: '-createdAt -updatedAt -__v -_id -stats -players -total -id'
	});

	if (stats) {
		query = query.slice('stats', -Math.min(stats, 25));
		query = query
			.populate({
				path: 'stats',
				select: '-createdAt -updatedAt -__v -team -player -_id -clan',
				populate: [
					{
						path: 'map',
						select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
					},
					{
						path: 'match',
						select: '-createdAt -updatedAt -__v -_id -stats -map -date'
					}
				]
			});
	}

	return options.meta ?
		Promise.props({
			data: query.lean().exec(),
			filtered: options.search ? model.count(find) : Promise.resolve(),
			total: model.count(defaultSearch)
		}) : query
		.lean()
		.exec();
}

/**
 * /v1/players
 *
 * Return players information.
 * Получить информацию об игроках.
 *
 * @param {Object} req,
 * @param {Object} req.query,
 * @param {String} [req.query.sort=desc]        Sort destination [asc,desc].
 * @param {Number} [req.query.skip=0]           Amount of skipped elems.
 * @param {Number} [req.query.limit=25          Limit of elems (max 50).
 * @param {String} [req.query.sortBy=id]        Sort criteria [id,exp,kill,die,win,match,hs,gk,mk,ak,cap,box,au].
 * @param {Number} [req.query.stats=25]         Amount of stats (max 50).
 * @param {String} [req.query.nickname]         Nickname to find.
 * @param {String} [req.query.pid]              PID to find.
 */
router.get('/', function getPlayersList(req, res, next) {
	var query = req.query;

	var middlewares = [];
	var pid = req.query.pid;
	/^(\d{5,}\,?)+$/g.test(pid) ? (pid = pid.split(',')) : (pid = undefined);

	if (pid || ([undefined, null, ''].indexOf(query.nickname) !== 0 && query.nickname.length > 1)) {
		let nickname = new Buffer(query.nickname || '', 'binary').toString('utf8');

		query.search = pid ? { id: { $in: pid } } : { $or: [
			{ $text: { $search: `\"${nickname}\"`, $diacriticSensitive: true } },
			{ nickname: {
				$regex: `^${nickname
					.replace(/(\||\$|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\'|\")/g, '\\$1')}`,
				$options: ''
			} }
		]};
		query.stats = ~[undefined, null, ''].indexOf(query.stats) ? 1 : Number(query.stats);
		query.limit = pid ? pid.length : (query.limit || 5);
		!query.noUrls && middlewares.push(function (result) {
			return result.map(function (player) {
				player.url = `${front}/players/${player.nickname}`;

				if (player.stats && player.stats.length && player.stats[0].match) {
					player.stats[0].url = `${front}/matches/${player.stats[0].match.id}`;
				}

				if (player.clan) {
					player.clan.url = `${front}/clans/${player.clan.abbr}`;
				}
				return player;
			});
		});
	}

	var promise = getData(query);

	if (middlewares.length) {
		middlewares.forEach(function (middleware) {
			promise = promise.then(middleware);
		})
	}

	promise = promise.then(res.json.bind(res))
		.catch(next);
});

/**
 * /v1/players/:public_id
 * /v1/players/:nickname
 *
 * Return player information.
 * Получить информацию об игроке.
 *
 * @param {Object} req,
 * @param {Object} req.query,
 * @param {*}      [req.query.byName]           Force to search by digit-only nickname.
 * @param {*}      [req.query.fullStats]        Fetch all stats.
 * @param {Number} [req.query.stats=25]         Amount of stats (max 100).
 * @param {String} [req.query.statsort=desc]    Sort destination for stats [asc,desc].
 * @param {String} [req.query.statskip=0]       Amount of skipped stats elems.
 */
router.get('/:player', function getPlayerData(req, res, next) {
	var query = req.query;

	var searchParam = req.params.player;
	var search = {};

	if (searchParam.match(/^\d+$/) && query.byName === undefined) {
		search = { id: searchParam };
	} else {
		search = { nickname: { $regex: new RegExp(`^${searchParam
			.replace(/(\||\$|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^)/g, '\\$1')}$`, 'i') } };
	}

	var stats = query.fullStats ? true :
		query.stats !== undefined ? (Math.abs(Number(query.stats)) || 0) : 25;

	var population = [{
		path: 'clan',
		select: '-_id -createdAt -updatedAt -__v -players -stats -total'/*,
		populate: [
			{
				path: 'stats',
				model: 'Stats',
				select: '-createdAt -updatedAt -__v -team -player -_id -clan',
				options: {
					sort: { date: -1 },
					limit: 10
				},
				populate: [
					{
						path: 'map',
						model: 'Maps',
						select: '-createdAt -updatedAt -__v -_id'
					},
					{
						path: 'match',
						model: 'Matches',
						select: '-createdAt -updatedAt -__v -_id -stats -map'
					}
				]
			},
			{
				path: 'players.player',
				model: model,
				select: '-createdAt -updatedAt -__v -_id -stats -ammunition -clan -clan_meta -skills'
			}
		]*/
	}];

	var cursor = model.findOne(search, `-__v -clan_meta ${!stats ? '-stats' : ''} -_id -createdAt -updatedAt -skills -ammunition`);
	if (stats) {
		stats =  Math.min(stats, 200);
		!query.fullStats && (cursor = cursor.slice('stats', -stats));
		population.push({ // TODO: distinct this
			path: 'stats',
			select: '-createdAt -updatedAt -__v -ammunition -team -player -_id -clan',
			options: {
				sort: { date: query.statsort === 'asc' ? 1 : -1 },
				limit: query.fullStats ? undefined : stats,
				skip: query.fullStats ? 0 : Math.abs(Number(query.statskip)) || 0
			},
			populate: [
				{
					path: 'map',
					select: libLang.select(query.lang) + ' -createdAt -updatedAt -__v -_id'
				},
				{
					path: 'match',
					select: '-createdAt -updatedAt -__v -_id -stats -map -date'
				}
			]
		});
	}

	cursor
		.populate(population)
		.lean()
		.exec()
		.then(function (result) {
			if (!result) {
				var error = new Error(`no player ${searchParam} found`);
				error.status = 404;
				return next(error);
			}
			res.json(result);
		})
		.catch(next);
});

module.exports = router;

