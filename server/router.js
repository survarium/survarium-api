'use strict';

var path    = require('path');
var express = require('express');
var router  = express.Router();

router.use(require('morgan')(':remote-addr :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms ":referrer" ":user-agent"'));

router.get('/', function (req, res) {
	res.json({
		api: req.protocol +
		'://' +
		req.hostname +
		'/v0'
	});
});

router.use('/v0', require('./v0/router'));

router.use(require('./middleware/errors'));

module.exports = router;
