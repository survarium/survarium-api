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

router.param('abbr', function (req, res, next, value) {
	ctl
		.id(value)
		.then(function (clan) {
			if (!clan) {
				return res.status(404).json({ code: 404, message: `Clan '${value}' not found`});
			}
			req.clan = clan;
			next();
		})
		.catch(next);
});

router.get('/:abbr', function (req, res, next) {
	ctl
		.fetch(req.clan)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:abbr/players', function (req, res, next) {
	ctl
		.players(req.clan, req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/clans/:abbr/matches');
router.get('/clans/:abbr/cw');
router.get('/clans/:abbr/cw/matches');

module.exports = router;

