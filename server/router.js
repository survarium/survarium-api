'use strict';

var path    = require('path');
var express = require('express');
var router  = express.Router();
var api     = express.Router();
var cors    = require('./middleware/cors');


router.use(require('morgan')(':remote-addr :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms ":referrer" ":user-agent"'));

router.use(cors);

api.get('/', function (req, res) {
	res.json({
		api: `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}v0`
	});
});

api.use('/v0', require('./v0/router'));
api.use('/v1', require('./v1/router'));

router.use('/', api);
router.use('/api', api);

router.use(require('./middleware/errors'));

module.exports = router;
