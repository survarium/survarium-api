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

	return model
		.find(options.search || {}, `-_id`)
		.skip(isNaN(skip) ? 0 : Math.abs(skip))
		.limit(isNaN(limit) ? 25 : (Math.abs(limit) || 25 ))
		.lean();
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

	getData({ search: { id: id }, lang: req.query.language })
		.then(function (data) {
			return res.json(data ? data[0] : data);
		})
		.catch(next);
});

module.exports = router;

