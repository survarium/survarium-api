'use strict';

const router  = require('express').Router();
const ctl     = require('./ctl');

router.get('/', function (req, res, next) {
	var query = req.query;

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

router.get('/:nickname', function (req, res, next) {
	ctl
		.fetch({ nickname: req.params.nickname })
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

module.exports = router;

