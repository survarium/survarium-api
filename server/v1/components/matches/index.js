'use strict';

const router  = require('express').Router();
const model   = require('./model');
const ctl     = require('./controller');
const config  = require('../../../configs');

if (config.v1.importer) {
	process.nextTick(require.bind(null, './importer'));
}

function getData(options) {
	options = options || {};

	var skip = Number(options.skip);
	var limit = Number(options.limit);

	var cursor = model[options.one ? 'findOne' : 'find'](options.search || {}, `-_id -updatedAt -createdAt -__v`);

	if (options.sort) {
		cursor = cursor.sort(options.sort);
	}

	cursor = cursor.skip(isNaN(skip) ? 0 : Math.abs(skip));

	if (!options.one) {
		cursor = cursor.limit(isNaN(limit) ? 25 : (Math.abs(limit) || 25 ));
	}

	return cursor.lean();
}

/**
 * Получить информацию о матчах
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.language=english]  язык, на котором получить информацию
 */
router.get('/', function (req, res, next) {
	var query = req.query;
	getData({ lang: query.language, skip: query.skip, limit: query.limit })
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить информацию о статусе импортов матчей
 */
router.get('/meta', function (req, res, next) {
	return ctl
		.stats()
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить последний матч
 */
router.get('/latest', function (req, res, next) {
	getData({ sort: { id: -1 }, one: true })
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить информацию о матче
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.language=english]  язык, на котором получить информацию
 */
router.get('/:id', function (req, res, next) {
	var id = Number(req.params.id);
	if (isNaN(id)) {
		return next(new Error('wrong type of id'));
	}

	getData({ search: { id: id }, lang: req.query.language, one: true })
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

