'use strict';

const router = require('express').Router();
const model  = require('./model');

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

router.get('/', function (req, res, next) {
	var query = req.query;
	getData({ skip: query.skip, limit: query.limit })
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

