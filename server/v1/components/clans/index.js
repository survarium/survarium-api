'use strict';

const router = require('express').Router();
const model  = require('./model');

function getData(options) {
	options = options || {};

	return model
		.find(options.search || {}, `-_id`)
		.lean();
}

router.get('/', function (req, res, next) {
	getData()
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

