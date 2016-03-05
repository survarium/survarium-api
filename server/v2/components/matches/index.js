'use strict';

const router  = require('express').Router();
const ctl     = require('./ctl');

router.get('/', function (req, res, next) {
	var query = req.query;
	query.__type = 'public';

	ctl
		.list(query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/cw', function (req, res, next) {
	var query = req.query;
	query.__type = 'cw';

	ctl
		.list(query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:id');

module.exports = router;

