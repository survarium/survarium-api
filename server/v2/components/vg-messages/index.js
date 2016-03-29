'use strict';

const config = require('../../../configs');
const router = require('express').Router();
const ctl    = require('./ctl');

router.get('/devs', function (req, res) {
	res.json(ctl.devs());
});

router.get('/messages', function (req, res, next) {
	var query = req.query;

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

if (config.importer.messages) {
	require('./importer');
}

module.exports = router;

