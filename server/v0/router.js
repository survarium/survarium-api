'use strict';

var router = require('express').Router();

var index = require('./controllers');

router.get('/', index.index);
router.get('/:cmd', index.cmd);

module.exports = router;
