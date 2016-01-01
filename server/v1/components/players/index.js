'use strict';

const router = require('express').Router();
const model  = require('./model');

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
	}[options.sortBy] || 'id';
	var sort = {};
	sort[sortBy] = options.sort === 'asc' ? 1 : -1;

	var stats = Number(options.stats);

	var query = model
		.find(options.search || {}, `-_id ${!stats ? '-stats' : ''} -__v -clan_meta -createdAt -updatedAt`)
		.sort(sort)
		.skip(Math.abs(Number(options.skip)) || 0)
		.limit(Math.min(Math.abs(Number(options.limit)) || 25, 50));

	if (stats) {
		query = query
			.populate([
				{
					path: 'stats',
					select: '-createdAt -updatedAt -__v -ammunition -team -player -_id -clan',
					options: {
						sort: { date: options.statsort === 'asc' ? 1 : -1 },
						limit: Math.min(Math.abs(Number(stats)) || 25, 50),
						skip: Math.abs(Number(options.statskip)) || 0
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
				},
				{
					path: 'clan',
					select: '-createdAt -updatedAt -__v -_id -stats -players -total'
				}
			])
	}

	return query
		.lean()
		.exec();
}

/**
 * Получить информацию об игроках
 */
router.get('/', function (req, res, next) {
	var query = req.query;
	getData(query)
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить информацию об игроке
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.stats=25]             количество сыгранных матчей
 * @param {String} [req.query.statsort=desc]        сортировать матчи по свежести asc или desc
 * @param {String} [req.query.language=english]     язык, на котором получить информацию
 */
router.get('/:search', function (req, res, next) {
	var query = req.query;

	var searchParam = req.params.search;
	var search = {};
	if (searchParam.match(/^\d+$/) && query.byName === undefined) {
		search = { id: searchParam };
	} else {
		search = { nickname: searchParam };
	}

	var stats = query.stats !== undefined ? (Math.abs(Number(query.stats)) || 0) : 25;

	var population = [{
		path: 'clan',
		select: '-_id -createdAt -updatedAt -__v -players._id',
		populate: [
			{
				path: 'stats',
				model: 'Stats',
				select: '-createdAt -updatedAt -__v -ammunition -team -player -_id -clan',
				options: {
					sort: { _id: -1 },
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
				select: '-createdAt -updatedAt -__v -_id -stats -ammunition -clan -clan_meta'
			}
		]
	}];

	if (stats) {
		population.push({ // TODO: distinct this
			path: 'stats',
			select: '-createdAt -updatedAt -__v -ammunition -team -player -_id',
			options: {
				sort: { date: query.statsort === 'asc' ? 1 : -1 },
				limit: Math.min(stats, 100),
				skip: Math.abs(Number(query.statskip)) || 0
			},
			populate: [
				{
					path: 'map',
					select: '-createdAt -updatedAt -__v -_id'
				},
				{
					path: 'match',
					select: '-createdAt -updatedAt -__v -_id -stats -map'
				}
			]
		});
	}

	model
		.findOne(search, `-__v -clan_meta ${!stats ? '-stats' : ''} -_id -createdAt -updatedAt`)
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

