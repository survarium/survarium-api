'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/matches/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

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
	var limit = 10;
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
