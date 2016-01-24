'use strict';

const router  = require('express').Router();
const model   = require('./model');
const libLang = require('../../lib/lang');

function getData(options) {
	options = options || {};

	var skip = Number(options.skip);
	var limit = Number(options.limit);
	var stats = options.stats !== undefined ? (Math.abs(Number(options.stats)) || 0) : 5;

	var cursor = model[options.one ? 'findOne' : 'find'](options.search || {},
		`-_id -updatedAt -createdAt -stats -__v${(!stats || options.slim) ? ' -matches -players' : ' -players._id'}`);

	cursor = cursor.sort(options.sort || { level: -1 });

	cursor = cursor.skip(isNaN(skip) ? 0 : Math.abs(skip));

	if (!options.one) {
		cursor = cursor.limit(isNaN(limit) ? 25 : (Math.abs(limit) || 25 ));
	}

	if (!options.slim) {
		options.stats !== -1  && (cursor = cursor.slice('matches', -(options.one ? stats : Math.min(stats, 5))));
		cursor = cursor.populate([
			{
				path: 'players.player',
				model: 'Players',
				select: '-createdAt -updatedAt -__v -_id -ammunition -skills -stats -clan -clan_meta'
			},
			{
				path: 'matches',
				model: 'Matches',
				select: '-createdAt -updatedAt -__v -_id -stats -clanwar.clans._id -duration -server -replay -clanwar.is',
				populate: [
					{
						path: 'map',
						model: 'Maps',
						select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
					},
					{
						path: 'clanwar.clans.clan',
						model: 'Clans',
						select: '-createdAt -updatedAt -__v -_id -matches -stats -total -players -foundation'
					}
				]
			}
		]);
	}

	return cursor.lean();
}

/**
 * Получить информацию о кланах
 * @param {Object}  req
 * @param {Object}  req.query
 * @param {String}  [req.query.lang]
 * @param {Boolean} [req.query.slim]  не загружать вложенные документы
 */
router.get('/', function (req, res, next) {
	var query = req.query;
	getData(query)
		.then(res.json.bind(res))
		.catch(next);
});

/**
 * Получить информацию о клане
 * @param {Object}  req
 * @param {Object}  req.query
 * @param {String}  [req.query.lang]
 * @param {Boolean} [req.query.slim]  не загружать вложенные документы
 */
router.get('/:abbr', function (req, res, next) {
	var query = req.query;
	var abbr = req.params.abbr;
	if ([undefined, null, ''].indexOf(abbr) > -1) {
		return next(new Error('wrong type of clan tag'));
	}

	var params = Object.assign({ stats: 300 }, query, {
		search: { abbr: { $regex: new RegExp(`^${abbr
			.replace(/(\||\$|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^)/g, '\\$1')}$`, 'i') } },
		one: true
	});

	getData(params)
		.then(function (result) {
			if (!result) {
				var error = new Error(`no clan ${abbr} found`);
				error.status = 404;
				return next(error);
			}
			res.json(result);
		})
		.catch(next);
});

module.exports = router;

