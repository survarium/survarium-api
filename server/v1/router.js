'use strict';

var router = require('express').Router();

router.use('/maps',    require('./components/maps'));

module.exports = router;
