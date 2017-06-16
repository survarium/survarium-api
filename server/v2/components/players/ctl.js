'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/players/model');
const stats   = require('../../../v1/components/stats/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');
const Query   = require('./query');

const checkId = /^\d+$/;

exports.id = function getPlayerId(nickname) {
    const fields = { _id: 1, nickname: 1, id: 1 };

	return model
        .findOne({ nickname }, fields)
        .lean()
        .then(player => {
            if (!player && checkId.test(nickname)) {
                return model
                    .findOne({ id: nickname }, fields)
                    .lean();
            }

            return player;
        });
};

exports.list = function list(options) {
	options = options || {};

	let totalQuery = {};

	let query = Query.list(options.filter);

	let fields = {
		clan: 0,
		stats: 0,
		ammunition: 0,
		ban: 0,
		skills: 0,
		nicknames: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};

	let sort = {};
	let limit = 20;
	let skip = 0;

	if (options.skip) {
		let __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	if (options.sort) {
		sort = options.sort;
	}

	let cursor = model
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

exports.fetch = function getPlayer(player) {
	let cursor = model
		.findOne({
			_id: player._id
		});

	cursor.select({
		_id: 0,
		clan: 0,
		stats: 0,
		skills: 0,
		ban: 0,
		createdAt: 0,
		'nicknames._id': 0,
		__v: 0
	});

	return cursor.lean();
};

exports.skills = function getSkills(player) {
	let cursor = model.aggregate([
		{ $match: { _id: player._id } },
		{ $unwind: '$skills' },
		{ $project: { id: '$skills.id', points: '$skills.points', _id: 0 } }
	]);

	return cursor.allowDiskUse(true).exec();
};

exports.stats = function getStats(player, options) {
	options = options || {};

	let totalQuery = {
		player: player._id
	};

	let query = {
		player: player._id
	};

	let fields = {
		player: 0,
		clan: 0,
		clanwar: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};

	let sort = options.sort || { date: -1 };
	let limit = 15;
	let skip = 0;

	if (options.skip) {
		let __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	const MAX_LIMIT = 50;

	if (options.limit) {
		let __limit = Number(options.limit);
		if (!isNaN(__limit) && (__limit > 0)) {
			limit = Math.min(MAX_LIMIT, __limit);
		}
	}

	let cursor = stats
		.find(query)
		.select(fields)
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	let mapProjection = libLang.selectJson();
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
		},
        {
            path: 'battlefield',
            select: '-createdAt -updatedAt -__v -_id'
        },
        {
            path: 'mode',
            select: '-createdAt -updatedAt -__v -_id'
        },
        {
            path: 'weather',
            select: '-createdAt -updatedAt -__v -_id'
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

exports.history = function getHistory(player, options) {
	options = options || {};

	let from = new Date();
	let dateFormat;

	switch (options.range) {
		case 'day':
		default:
			dateFormat = '%Y-%m-%dT%H:00:00';
			from.setUTCSeconds(0, 0);
			from.setUTCDate(from.getUTCDate() - 2);
			break;
		case 'week':
			dateFormat = '%Y-%m-%d';
			from.setUTCMinutes(0, 0, 0);
			from.setUTCDate(from.getUTCDate() - 7);
			break;
		case 'month':
			dateFormat = '%Y-%m-%d';
			from.setUTCHours(0, 0, 0, 0);
			from.setUTCMonth(from.getUTCMonth() - 3);
			break;
	}

	let fields = ['kills', 'dies', 'score', 'headshots', 'grenadeKills', 'meleeKills', 'artefactUses'];
	let project = {
		date: { $dateToString: {
			format: dateFormat,
			date  : '$date'
		} },
		victory: { $cond : [ '$victory', 1, 0 ] },
		level: 1,
        place: 1
	};
	let output = { _id: 0, date: '$_id', matches: 1, victories: 1, level: 1, place: 1 };
	let group = { _id: '$date', matches: { $sum: 1 }, victories: { $sum: '$victory' }, level: { $avg: '$level' }, place: { $avg: '$place' } };
	let grouper;

	switch (options.group) {
		case 'avg':
			grouper = '$avg';
			break;
		case 'sum':
		default:
			grouper = '$sum';
			break;
	}

	fields.reduce((result, field) => {
		let $field = `$${field}`;
		group[field] = { [`${grouper}`]: $field };
		project[field] = $field;
		output[field]  = $field;
	}, null);

	return stats
		.aggregate([
			{ $match: { player: player._id, date: { $gte: from } } },
			{ $project: project },
			{ $group: group },
			{ $sort: { _id: 1 } },
			{ $project: output }
		])
		.allowDiskUse(true).exec();
};

exports.top = function getTop(query) {
	let date = new Date();
	let period = query.period === 'day' ? 'day' : 'hour';

	if (period === 'day') {
		date.setMinutes(0, 0, 0, 0);
		date.setDate(date.getDate() - 1);
	} else {
		date.setHours(date.getHours() - 1, 0, 0, 0);
	}

	return stats
		.aggregate([
			{ $match: { date: { $gte: date } } },
			{ $group: { _id: { level: '$level' }, data: { $push: { level: '$level', player: '$player', match: '$match', score: '$score' } } } },
			{ $unwind: '$data' },
			{ $sort: { 'data.score': -1 } },
			{ $group: { _id: '$_id', data: { $first: '$data' } } },
			{ $lookup: { from: 'matches', localField: 'data.match', foreignField: '_id', as: 'data.match' } },
			{ $lookup: { from: 'players', localField: 'data.player', foreignField: '_id', as: 'data.player' } },
			{ $project: { _id: 0, level: '$data.level', score: '$data.score',
				'player.nickname': { $arrayElemAt: ['$data.player.nickname', 0] },
				'player.clan_meta': { $arrayElemAt: ['$data.player.clan_meta', 0] },
				match: { $arrayElemAt: ['$data.match.id', 0] } } },
			{ $sort: { level: 1 } },
			{ $limit: 10 }
		])
		.allowDiskUse(true).exec();
};

exports.unique = function getUnique(query) {
    let match = { date: {} };
	let from;
	let till;

	if (query.date && query.date.match(/^((\d{4})-(\d{2})-(\d{2}))(T((\d{2}):(\d{2})))?$/)) {
	    let date = RegExp.$1;
	    let year = RegExp.$2;
	    let month = RegExp.$3;
	    let day = RegExp.$4;
	    let time = RegExp.$6;
	    let hour = RegExp.$7;
	    let minute = RegExp.$8;

        if (!time) {
            from = new Date(`${date}T00:00Z`);
            till = new Date(`${date}T23:59Z`);
        }
    }

	if (!from) {
	    from = new Date();
	    let minutes = Number(query.minutes);

        if (query.period === 'hour') {
            from.setHours(from.getHours() - 1, 0, 0, 0);
        } else if (query.period === 'half') {
            from.setMinutes(from.getMinutes() - 30, 0, 0);
        } else if (query.period === 'month') {
            from.setHours(from.getHours() - 1, 0, 0, 0);
            from.setMonth(from.getMonth() - 1);
        } else if (minutes && !isNaN(minutes)) {
            from.setMinutes(from.getMinutes() - Math.min(minutes, 21600), 0, 0); // max 15d
        } else {
            from.setMinutes(0, 0, 0);
            from.setDate(from.getDate() - 1);
        }
    }

    match.date['$gte'] = from;
	till && (match.date['$lte'] = till);

	return stats
		.aggregate([
			{ $match: match },
			{ $group: { _id: '$player' }},
            { $group: { _id: null, count: { $sum: 1 } } }
		])
		.allowDiskUse(true).exec().then(function (result) {
			return { count: result[0] ? result[0].count : 0 };
		});
};

exports.search = function performSearch(query) {
	let search;

	let wideSearch = query.wide === 'true';

	if (query.nickname) {
		let nickname = decodeURIComponent(query.nickname.trim());

		if (nickname.length < 3) {
			return Promise.resolve(null);
		}

		let escaped = nickname
			.replace(/(\||\$|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\'|\")/g, '\\$1');

		search = [
			{
				$text: {
					$search            : `\"${nickname}\"`,
					$diacriticSensitive: true,
					$caseSensitive     : false
				}
			},
			{
				nickname: {
					$regex: `${wideSearch ? '' : '^'}${escaped}`, $options: wideSearch ? 'i' : ''
				}
			}
		];

		if (!wideSearch) {
			let firstChar = escaped.slice(0, 1);
			let bigFirstLetter = firstChar.toUpperCase();

			if (firstChar !== bigFirstLetter) {
				search.push({
					nickname: {
						$regex: `^${bigFirstLetter}${escaped.slice(1)}`, $options: ''
					}
				});
			}
		}

		search = { $or: search };
	}

	if (!search) {
		return Promise.resolve(null);
	}

	const aggregator = [
        { $match: search },
        { $project: { _id: 0, nickname: 1, clan: '$clan_meta', rel: { $meta: "textScore" } } },
        { $sort: { rel: -1 } }
    ];

    if (query.limit) {
        let limit = Number(query.limit);

        if (!isNaN(limit) && (limit > 0)) {
            aggregator.push({ "$limit": limit });
        }
    }

	return model.aggregate(aggregator).allowDiskUse(true).exec();
};
