'use strict';

var router = require('express').Router();
var config = require('../configs');

router.use('/slots',     require('./components/slots'));
router.use('/items',     require('./components/items'));
router.use('/maps',      require('./components/maps'));

router.use('/clanroles', require('./components/clanroles'));
router.use('/clans',     require('./components/clans'));
router.use('/stats',     require('./components/stats'));
router.use('/matches',   require('./components/matches'));
router.use('/players',   require('./components/players'));

if (config.v1.telegram.server) {
	require('./services/telegram');
}

module.exports = router;
