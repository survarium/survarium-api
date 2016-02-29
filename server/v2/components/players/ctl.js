'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/players/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

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
	var limit = 25;
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
