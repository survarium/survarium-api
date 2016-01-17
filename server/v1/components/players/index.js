'use strict';

const router = require('express').Router();
const model  = require('./model');
const config = require('../../../configs');
const front  = config.front;

function getData(options) {
	options = options || {};

	var sortBy = {
		id: 'id',
		exp: 'progress.experience',
		kill: 'total.kills',
		die: 'total.dies',
		win: 'total.victories',
		match: 'total.matches',
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

	var query = model
		.find(options.search || {}, `-_id ${!stats ? '-stats' : ''} -__v -clan_meta -skills -ammunition -createdAt -updatedAt`)
		.sort(sort)
		.skip(Math.abs(Number(options.skip)) || 0)
		.limit(Math.min(Math.abs(Number(options.limit)) || 25, 50));

	if (stats) {
		query = query.slice('stats', -Math.min(stats, 25));
		query = query
			.populate([
				{
					path: 'stats',
					select: '-createdAt -updatedAt -__v -team -player -_id -clan',
					populate: [
						{
							path: 'map',
							select: '-createdAt -updatedAt -__v -_id'
						},
						{
							path: 'match',
							select: '-createdAt -updatedAt -__v -_id -stats -map -date'
						}
					]
				},
				{
					path: 'clan',
					select: '-createdAt -updatedAt -__v -_id -stats -players -total -id'
				}
			])
	}

	return query
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
 */
router.get('/', function (req, res, next) {
	var query = req.query;
	var middlewares = [];

	if ([undefined, null, ''].indexOf(query.nickname) !== 0 && query.nickname.length > 1) {
		query.search = { $or: [
			{ $text: { $search: `\"${query.nickname}\"`, $diacriticSensitive: true } },
			{ nickname: { $regex: new RegExp(`${query.nickname
				.replace(/(\||\$|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^)/g, '\\$1')}`, 'i') } }
		]};
		query.stats = 1;
		middlewares.push(function (result) {
			return result.map(function (player) {
				player.url = `${front}/?player=${player.nickname}`;
				if (player.stats && player.stats.length && player.stats[0].match) {
					player.stats[0].url = `${front}/?match=${player.stats[0].match.id}`;
				}
				if (player.clan) {
					player.clan.url = `${front}/?clan=${player.clan.abbr}`;
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
router.get('/:player', function (req, res, next) {
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

	if (stats) {
		population.push({ // TODO: distinct this
			path: 'stats',
			select: '-createdAt -updatedAt -__v -ammunition -team -player -_id -clan',
			options: {
				sort: { date: query.statsort === 'asc' ? 1 : -1 },
				limit: query.fullStats ? undefined : Math.min(stats, 100),
				skip: query.fullStats ? 0 : Math.abs(Number(query.statskip)) || 0
			},
			populate: [
				{
					path: 'map',
					select: '-createdAt -updatedAt -__v -_id'
				},
				{
					path: 'match',
					select: '-createdAt -updatedAt -__v -_id -stats -map -date'
				}
			]
		});
	}

	model
		.findOne(search, `-__v -clan_meta ${!stats ? '-stats' : ''} -_id -createdAt -updatedAt -skills -ammunition`)
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

