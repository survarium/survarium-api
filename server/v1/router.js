'use strict';

var router = require('express').Router();

router.use('/items',   require('./components/items'));
router.use('/maps',    require('./components/maps'));
router.use('/slots',   require('./components/slots'));

module.exports = router;
