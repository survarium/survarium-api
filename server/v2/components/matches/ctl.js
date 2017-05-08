'use strict';

const Promise = require('bluebird');
const config  = require('../../../configs');
const model   = require('../../../v1/components/matches/model');
const Stats   = require('../../../v1/components/stats/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');
const Query   = require('./query');
const got     = require('got');

const langDefault = config.api.langDefault;

exports.id = function (id) {
	if (!/^\d+$/.test(id)) {
		return Promise.resolve();
	}

	return model.findOne({ id: id }, { _id: 1, id: 1, replay: 1 }).lean();
};

exports.list = function list (options) {
	options = options || {};

	let totalQuery = {};

    let query = Query.list(options.filter);

	let fields = {
		stats: 0,
		_id: 0,
		__v: 0,
		updatedAt: 0
	};
	let sort = options.sort || { id: -1 };
	let limit = 20;
	let skip = 0;
	let populate = [{
		path: 'map',
        select: libLang.select() + ' -createdAt -updatedAt -__v -_id'
	}, {
		path: 'place',
        select: '-createdAt -updatedAt -__v -_id'
	}, {
		path: 'mode',
        select: '-createdAt -updatedAt -__v -_id'
	}, {
		path: 'weather',
        select: '-createdAt -updatedAt -__v -_id'
	}];

	if (options.skip) {
		let __skip = Number(options.skip);

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
	const cursor = model
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
			select: libLang.select() + ' -createdAt -updatedAt -__v -_id'
		},
        {
            path: 'place',
            select: '-createdAt -updatedAt -__v -_id'
        },
        {
            path: 'mode',
            select: '-createdAt -updatedAt -__v -_id'
        },
        {
            path: 'weather',
            select: '-createdAt -updatedAt -__v -_id'
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
		.select('stats rating_match map mode')
        .populate([
            {
                path: 'map',
                select: {
                    _id: 0,
                    [`lang.${langDefault}.mode`]: 1
                }
            },
            {
                path: 'mode',
                select: {
                    _id: 0,
                    title: 1
                }
            }
        ])
		.lean()
		.then(function (match) {
			let sort = options.sort || { score: -1 };

			let cursor = Stats.find({
				_id: { $in: match.stats }
			});

            let mode = match.map ? match.map.lang[langDefault].mode : match.mode.title;
            let type = match.rating_match ? 'rating' : 'random';

			cursor.select({ _id: 0, match: 0, map: 0, clanwar: 0, level: 0, rating_match: 0, clan: 0, __v: 0, createdAt: 0, updatedAt: 0, date: 0 });

			cursor.populate([
				{
					path: 'player',
					select: {
					    _id: 0,
                        nickname: 1,
                        'progress.level': 1,
                        ['progress.elo.' + mode + '.' + type]: 1,
                        'clan_meta.abbr': 1,
                        banned: 1
					}
				}
			]);

			cursor.sort(sort);

            function getElo(stat) {
                let progress = stat.player.progress;

                if (progress && progress.elo && progress.elo[mode] && progress.elo[mode][type] !== undefined) {
                    progress.elo = progress.elo[mode][type];
                } else progress.elo = 1000;

                return stat;
            }

			return cursor.lean().then(result => result.map(getElo));
		});
};

exports.timeline = function (query) {
	var date = new Date();
	date.setHours(date.getHours() - 23, 0, 0, 0);

    var match = { date: { $gte: date } };

    if (~['rating', 'random'].indexOf(query.type)) {
        match.rating_match = query.type === 'rating';
    }

	return model.aggregate([
        { $match: match },
		{ $group: { _id: { level: '$level', hour: { $hour: '$date' } }, date: { $min: '$date' }, total: { $sum: 1 } } },
		{ $group: { _id: '$_id.level', hours: { $push: { hour: '$_id.hour', total: '$total', date: '$date' } }, total: { $sum: '$total' } } },
		{ $project: { level: '$_id', hours: '$hours', date: '$date', total: '$total', _id: 0 }}
	]).allowDiskUse(true).exec();
};

exports.replay = function (match) {
	if (match.replay) {
		return Promise.resolve(match.replay);
	}

	let id = match.id.toString();
	let base = id.length === 7 ? 3 : 4;

	let range = [
		`${id.slice(0, base)}0000`,
		`${id.slice(0, base)}9999`
	];

	let servers = [
		`node-1.survarium.com`,
		`node-2.survarium.com`,
		`node-3.survarium.com`,
		`node-4.survarium.com`
	];

	function checkReplay(replay) {
		return got
			.head(replay, {
				retries: 0,
				headers: {
					'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4'
				}
			});
	}

	return Promise
		.any(servers.map(server => {
			let replay = `http://${server}/replays/${range[0]}-${range[1]}/${id}.sur`;

			return checkReplay(replay)
				.then(res => replay);
		}))
		.catch(() => {
			console.error(`Cannot get replay for match ${id}`);
			return null;
		});
};
