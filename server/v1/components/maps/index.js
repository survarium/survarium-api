'use strict';

const router = require('express').Router();
const model  = require('./model');

const config = require('../../../configs');
const langs  = config.api.languages;

require('./importer');

/**
 * Получить информацию о картах, включая погодное явление и режим игры
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} [req.query.language=english]  язык, на котором получить информацию
 */
router.get('/', function (req, res, next) {
	var lang = req.query.language;
	if (langs.indexOf(lang) === -1) {
		lang = config.api.langDefault;
	}
	model
		.find({}, `-_id id lang.${lang}`)
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
		})
		.then(res.json.bind(res))
		.catch(next);
});

module.exports = router;
