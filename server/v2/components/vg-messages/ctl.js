'use strict';

const Promise = require('bluebird');
const model   = require('./model');
const db      = require('../../../v1/lib/db');
const config  = require('../../../configs');
const Query   = require('./query');
const devs    = config.v2.developers;

exports.devs = function () {
	return devs.slice();
};

exports.one = function (id) {
    return model.findOne({ _id: id }, { _v: 0 }).lean();
};

exports.list = function list (options) {
	options = options || {};

	var totalQuery = {};

    var query = Query.list(options.filter);

	var fields = {
		__v: 0
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

    const MAX_LIMIT = 50;

    if (options.limit) {
        var __limit = Number(options.limit);
        if (!isNaN(__limit) && (__limit > 0)) {
            limit = Math.min(MAX_LIMIT, __limit);
        }
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
