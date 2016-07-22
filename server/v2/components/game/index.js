'use strict';

const router = require('express').Router();
const ctl    = require('./ctl');
const config = require('../../../configs');

const multer = require('multer');

router.get('/factions', function (req, res, next) {
	var query = req.query;

	ctl
		.factions(query)
		.then(function (result) {
			return res.json(result);
		})
		.catch(next);
});

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

router.get('/items/:item/usage', function (req, res, next) {
	ctl
		.itemUsage(Number(req.params.item))
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

function modelAuth(req, res, next) {
    let key = req.query.key;
    
    if (!key || !~config.keys.models.indexOf(key)) {
        return next({ message: '`Key` is invalid' });
    }
    
    next();
}

router.get('/items/:item/model', modelAuth, ctl.one, function (req, res, next) {
    ctl
        .modelForm({
            item: req.item
        })
        .then(html => res.type('html').send(html))
        .catch(next);
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.game.upload);
    },
    filename: (req, file, cb) => {
        cb(null, req.item.name + '.mview');
    }
});

const upload = multer({ storage: storage });

router.post('/items/:item/model', modelAuth, ctl.one, upload.single('mview'), function (req, res, next) {
    ctl
        .modelUpload({
            item: req.item,
            file: req.file
        })
        .then(html => res.type('html').send(html))
        .catch(next);
});

module.exports = router;

