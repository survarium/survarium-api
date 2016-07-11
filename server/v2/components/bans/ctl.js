'use strict';

const Promise = require('bluebird');
const model   = require('./model');

exports.list = function list(options) {
	options = options || {};

	var totalQuery = {};

	var query  = {
        deletedAt: { $exists: false }
    };

	var fields = {
		_id: 0,
		__v: 0,
		'players._id': 0
	};
	var sort   = options.sort || { date: -1 };
	var limit  = 10;
	var skip   = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	var cursor = model
		.find(query)
		.select(fields)
		.populate([
			{
				path: 'players.player',
				select: { nickname: 1, 'progress.level': 1, _id: 0 }
			},
			{
				path: 'players.clan',
				select: { abbr: 1, _id: 0 }
			},
			{
				path: 'vg_message',
				select: { lang: 1, date: 1, forum: 1, topic: 1, post: 1, _id: 0 }
			}
		])
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	return Promise.props({
		data    : cursor
			.lean()
			.exec(),
		filtered: model.count(query),
		total   : model.count(totalQuery),
		skip    : skip,
		limit   : limit
	});
};
