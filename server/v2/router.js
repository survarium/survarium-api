'use strict';

var router = require('express').Router();

router.use('/clans',      require('./components/clans'));
router.use('/players',    require('./components/players'));
router.use('/matches',    require('./components/matches'));
//router.use('/devtracker', require('./components/vg-messages'));
/*router.use('/matches',   require('./components/matches'));
*/

module.exports = router;
