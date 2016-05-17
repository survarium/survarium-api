'use strict';

var router = require('express').Router();
var config = require('../configs');

if (config.discord.server) {
	require('./services/discord/server');
}

router.use('/clans',      require('./components/clans'));
router.use('/players',    require('./components/players'));
router.use('/matches',    require('./components/matches'));
router.use('/vg',         require('./components/vg-messages'));
router.use('/bans',       require('./components/bans'));

module.exports = router;
