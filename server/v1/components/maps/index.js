'use strict';

const router = require('express').Router();
const model  = require('./model');

const config = require('../../../configs');
const langs  = config.api.languages;

// require('./importer');

function getData(options) {
	options = options || {};

	var lang = options.lang;
	if (langs.indexOf(lang) === -1) {
		lang = config.api.langDefault;
	}
	return model
		.find(options.search || {}, `-_id id lang.${lang}`)
		.lean()
		.then(function (elems) {
			if (!elems || !elems.length) {
				return elems;
			}
			return elems.map(function (elem) {
				var result =  elem.lang[lang];
				result.id = elem.id;
				return result;
			});
		});
}

/**
 * Получить информацию о картах, включая погодное явление и режим игры
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.language=english]  язык, на котором получить информацию
 */
router.get('/', function (req, res, next) {
	getData({ lang: req.query.language })
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить информацию о карте
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.language=english]  язык, на котором получить информацию
 */
router.get('/:id', function (req, res, next) {
	var id = Number(req.params.id);
	if (isNaN(id)) {
		return next(new Error('wrong type of id'));
	}

	getData({ search: { id: id }, lang: req.query.language })
		.then(function (data) {
			return res.json(data ? data[0] : data);
		})
		.catch(next);
});

module.exports = router;

