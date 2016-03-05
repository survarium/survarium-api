'use strict';

const router  = require('express').Router();
/*const ctl     = require('./ctl');

router.get('/', function (req, res, next) {
	var query = req.query;
	query.__type = 'public';

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});*/

require('./importer');

module.exports = router;

