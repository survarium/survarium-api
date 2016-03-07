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

router.param('id', function (req, res, next, value) {
	ctl
		.id(value)
		.then(function (match) {
			if (!match) {
				return res.status(404).json({ code: 404, message: `Match '${value}' not found`});
			}
			req.match = match;
			next();
		})
		.catch(next);
});

router.get('/:id', function (req, res, next) {
	ctl
		.fetch(req.match, req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:id/stats', function (req, res, next) {
	ctl
		.stats(req.match, req.query)
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

