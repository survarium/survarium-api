'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/clans/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

exports.list = function list (options) {
	options = options || {};

	var totalQuery = {};

	var query = {};
	var fields = {
		stats: 0,
		matches: 0,
		players: 0,
		_id: 0,
		__v: 0,
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

	if (options.__type === 'cw') {
		query['total.matches'] = totalQuery['total.matches'] = { $gt: 0 };
		fields.totalPublic = 0;
		sort = { elo: -1 };
	} else {
		fields.total = 0;
		sort = { elo: -1 };
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
