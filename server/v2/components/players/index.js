'use strict';

const router  = require('express').Router();
const ctl     = require('./ctl');

router.get('/', function getPlayersList(req, res, next) {
	ctl
		[req.query.nickname ? 'search' : 'list'](req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/top', function getPlayersTop(req, res, next) {
	ctl
		.top(req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/unique', function getPlayersUnique(req, res, next) {
	ctl
		.unique(req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.param('nickname', function getPlayerParam(req, res, next, value) {
	ctl
		.id(value)
		.then(function (player) {
			if (!player) {
				return res.status(404).json({ code: 404, message: `Player '${value}' not found`});
			}
			req.player = player;
			next();
		})
		.catch(next);
});

router.get('/:nickname', function getPlayer(req, res, next) {
	ctl
		.fetch(req.player)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:nickname/stats', function getPlayerStats(req, res, next) {
	ctl
		.stats(req.player, req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:nickname/history', function getPlayerHistory(req, res, next) {
	ctl
		.history(req.player, req.query)
		.then(res.json.bind(res))
		.catch(next);
});

router.get('/:nickname/skills', function getPlayerSkills(req, res, next) {
	ctl
		.skills(req.player)
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;

