'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/matches/model');
const Stats   = require('../../../v1/components/stats/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

exports.id = function (id) {
	if (!/^\d+$/.test(id)) {
		return Promise.resolve();
	}

	return model.findOne({ id: id }, { _id: 1, id: 1 }).lean();
};

exports.list = function list (options) {
	options = options || {};

	var totalQuery = {};

	var query = {};
	var fields = {
		stats: 0,
		_id: 0,
		__v: 0,
		updatedAt: 0
	};
	var sort = options.sort || { id: -1 };
	var limit = 20;
	var skip = 0;
	var populate = [{
		path: 'map',
        select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
	}];

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	if (options.__type === 'cw') {
		totalQuery['clanwar'] = query['clanwar'] = true;
		fields['clans._id'] = 0;
		fields['clans.total'] = 0;
		populate.push({
			path: 'clans.clan',
			select: 'abbr name'
		});
	} else {
		fields.clans = 0;
	}

	var cursor = model
		.find(query)
		.select(fields)
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	if (populate.length) {
		cursor.populate(populate);
	}

	return Promise.props({
		data: cursor
			.lean()
			.exec(),
		filtered: model.count(query),
		total: model.count(totalQuery),
		skip: skip,
		limit: limit
	});
};

exports.fetch = function (match, options) {
	var cursor = model
		.findOne({
			_id: match._id
		});

	cursor.select({
		_id: 0,
		clan: 0,
		'clans._id': 0,
		'clans.total': 0,
		stats: 0,
		createdAt: 0,
		updatedAt: 0,
		__v: 0
	});

	cursor.populate([
		{
			path: 'map',
			select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
		},
		{
			path: 'clans.clan',
			select: { _id: 0, abbr: 1, name: 1, id: 1 }
		}
	]);

	return cursor.lean();
};

exports.stats = function (match, options) {
	return model
		.findOne({
			_id: match._id
		})
		.select('stats')
		.lean()
		.then(function (match) {
			var sort = options.sort || { score: -1 };

			var cursor = Stats.find({
				_id: { $in: match.stats }
			});

			cursor.select({ _id: 0, match: 0, map: 0, clanwar: 0, level: 0, clan: 0, __v: 0, createdAt: 0, updatedAt: 0, date: 0 });

			cursor.populate([
				{
					path: 'player',
					select: { _id: 0, nickname: 1, 'progress.level': 1, 'clan_meta.abbr': 1, banned: 1 }
				}
			]);

			cursor.sort(sort);

			return cursor.lean();
		});
};

exports.timeline = function () {
	var date = new Date();
	date.setHours(date.getHours() - 23, 0, 0, 0);

	return model.aggregate([
		{ $match: { date: { $gte: date } } },
		{ $group: { _id: { level: '$level', hour: { $hour: '$date' } }, date: { $min: '$date' }, total: { $sum: 1 } } },
		{ $group: { _id: '$_id.level', hours: { $push: { hour: '$_id.hour', total: '$total', date: '$date' } }, total: { $sum: '$total' } } },
		{ $project: { level: '$_id', hours: '$hours', date: '$date', total: '$total', _id: 0 }}
	]).allowDiskUse(true).exec();
};
