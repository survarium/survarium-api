'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/players/model');
const stats   = require('../../../v1/components/stats/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

exports.id = function (nickname) {
	return model.findOne({ nickname: nickname }, { _id: 1, nickname: 1 }).lean();
};

exports.list = function list (options) {
	options = options || {};

	var totalQuery = {};

	var query = {};

	var fields = {
		clan: 0,
		stats: 0,
		ammunition: 0,
		skills: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};

	var sort = {};
	var limit = 20;
	var skip = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	if (options.sort) {
		sort = options.sort;
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

exports.fetch = function (player) {
	var cursor = model
		.findOne({
			_id: player._id
		});

	cursor.select({
		_id: 0,
		clan: 0,
		stats: 0,
		ammunition: 0,
		skills: 0,
		createdAt: 0,
		__v: 0
	});

	return cursor.lean();
};

exports.stats = function (player, options) {
	options = options || {};

	var totalQuery = {
		player: player._id
	};

	var query = {
		player: player._id
	};

	var fields = {
		player: 0,
		clan: 0,
		clanwar: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};

	var sort = options.sort || { date: -1 };
	var limit = 20;
	var skip = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	var cursor = stats
		.find(query)
		.select(fields)
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	var mapProjection = libLang.selectJson(options.lang);
	mapProjection['_id'] = 0;
	mapProjection.createdAt = 0;
	mapProjection.updatedAt = 0;
	mapProjection['__v'] = 0;

	cursor.populate([
		{
			path: 'match',
			select: { _id: 0, id: 1 }
		},
		{
			path: 'map',
			select: mapProjection
		}
	]);

	return Promise.props({
		data: cursor
			.lean()
			.exec(),
		filtered: stats.count(query),
		total: stats.count(totalQuery),
		skip: skip,
		limit: limit
	});
};
