'use strict';

const Promise = require('bluebird');
const router  = require('express').Router();
const ctl     = require('./ctl');

router.get('/', function (req, res, next) {
	var query = req.query;
	query.__type = 'public';

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

router.get('/cw', function (req, res, next) {
	var query = req.query;
	query.__type = 'cw';

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

router.get('/clans/:abbr');
router.get('/clans/:abbr/members');
router.get('/clans/:abbr/matches');
router.get('/clans/:abbr/cw');
router.get('/clans/:abbr/cw/matches');

module.exports = router;

