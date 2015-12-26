'use strict';

var router = require('express').Router();

router.use('/clans',     require('./components/clans'));
router.use('/clanroles', require('./components/clanroles'));
router.use('/items',     require('./components/items'));
router.use('/maps',      require('./components/maps'));
router.use('/matches',   require('./components/matches'));
router.use('/slots',     require('./components/slots'));
router.use('/players',   require('./components/players'));
router.use('/stats',     require('./components/stats'));

module.exports = router;
