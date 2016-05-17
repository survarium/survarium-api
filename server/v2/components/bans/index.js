'use strict';

const router = require('express').Router();
const ctl    = require('./ctl');

router.get('/', (req, res, next) => {
	var query = req.query;

	ctl
		.list(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

module.exports = router;

