'use strict';

const router = require('express').Router();
const ctl    = require('./ctl');

router.get('/versions', function (req, res, next) {
	var query = req.query;

	ctl
		.versions(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

router.get('/items', function (req, res, next) {
	var query = req.query;

	ctl
		.items(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

router.get('/items/:items', function (req, res, next) {
	var query = req.query;
	var items = req.params.items;
	var itemsType;
	if (items.match(/^(\d+\,?)+$/)) {
		itemsType = '_id';
		items = req.params.items.split(',').map(Number).filter(function (id) {
			return !isNaN(id);
		});
	} else {
		itemsType = 'name';
		items = req.params.items.split(',').filter(Boolean);
	}

	ctl
		.items({
			type: itemsType,
			list: items
		}, query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

module.exports = router;

