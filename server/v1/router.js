'use strict';

var router = require('express').Router();

router.use('/items',     require('./components/items'));
router.use('/maps',      require('./components/maps'));
router.use('/slots',     require('./components/slots'));

router.use('/clanroles', require('./components/clanroles'));
router.use('/clans',     require('./components/clans'));
router.use('/stats',     require('./components/stats'));
router.use('/matches',   require('./components/matches'));
router.use('/players',   require('./components/players'));

module.exports = router;
