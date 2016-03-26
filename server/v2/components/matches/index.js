'use strict';

const router   = require('express').Router();
const ctl      = require('./ctl');
const importer = require('../../../v1/components/matches/importer');
const config   = require('../../../configs');

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

router.get('/timeline', function (req, res, next) {
	ctl
		.timeline(req.query)
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

router.get('/:importId/import', function (req, res, next) {
	let id = Number(req.params.importId);
	let key = req.query.special;

	if (!config.special) {
		return next({ message: 'No `special` key configured' });
	}

	if (config.special !== key) {
		return next({ message: 'Key `special` is invalid' });
	}

	if (isNaN(id)) {
		return res.status(403).json({ code: 403, message: 'No valid `id` received' });
	}

	importer
		.importMatch(id)
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

