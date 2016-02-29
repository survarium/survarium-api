'use strict';

var router = require('express').Router();

router.use('/clans',     require('./components/clans'));
router.use('/players',   require('./components/players'));
/*router.use('/matches',   require('./components/matches'));
*/

module.exports = router;
