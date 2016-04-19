'use strict';

const Promise = require('bluebird');
const model   = require('../../../v1/components/clans/model');
const Players = require('../../../v1/components/players/model');
const Stats   = require('../../../v1/components/stats/model');
const Matches = require('../../../v1/components/matches/model');
const db      = require('../../../v1/lib/db');
const libLang = require('../../../v1/lib/lang');

exports.id = function (abbr) {
	return model.findOne({ abbr: abbr }, { _id: 1, abbr: 1 }).lean();
};

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
	var sort = options.sort || { elo: -1 };
	var limit = 20;
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
	} else {
		fields.total = 0;
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

exports.fetch = function (clan) {
	var cursor = model
		.findOne({
			_id: clan._id
		});

	cursor.select({
		_id: 0,
		players: 0,
		stats: 0,
		matches: 0,
		createdAt: 0,
		__v: 0
	});

	return cursor.lean();
};

exports.players = function players (clan, options) {
	options = options || {};

	var sort = options.sort || { role: -1 };
	var limit = 10;
	var skip = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	var roleSort = sort.role;
	if (roleSort) {
		delete sort.role;
	}

	var total;

	return model
		.findOne({ _id: clan._id }, { players: 1 })
		.lean()
		.then(function (clan) {
			var players = clan.players;
			total = players.length;

			var filtered = total;

			var roles = {};

			var ids = players.map(function (elem) {
				var id = elem.player;
				roles[id] = { role: elem.role };
				return id;
			});

			if (roleSort) {
				var Ranks = {
					commander: 99,
					assistant: 80,
					warlord  : 50,
					soldier  : 10
				};

				ids = ids.sort(function (a, b) {
					if (roleSort === '1') {
						let c = b;
						b = a;
						a = c;
					}

					let w1 = Ranks[roles[a].role] || 0;
					let w2 = Ranks[roles[b].role] || 0;
					return w2 - w1;
				}).slice(skip, skip + limit);

				ids.forEach(function (id, index) {
					roles[id].index = index;
				});
			}

			var query = { _id: { $in: ids } };

			var cursor = Players
				.find(query)
				.select({
					clan: 0,
					clan_meta: 0,
					stats: 0,
					skills: 0,
					ammunition: 0,
					__v: 0,
					createdAt: 0
				});

			if (!roleSort) {
				cursor
					.sort(sort)
					.skip(skip)
					.limit(limit)
			}

			return Promise.props({
				data: cursor
					.lean()
					.then(function (players) {
						var result = [];

						if (roleSort) {
							players.forEach(function (player) {
								let id = player._id;
								player.role = roles[id].role;
								delete player['_id'];
								result[roles[id].index] = player;
							});
						} else {
							result = players.map(function (player) {
								player.role = roles[player._id].role;
								delete player['_id'];
								return player;
							});
						}
						return result;
					}),
				filtered: filtered,
				total: total,
				skip: skip,
				limit: limit
			});
		});
};

exports.matches = function matches(clan, options) {
	options = options || {};

	var totalQuery = {};

	var query = totalQuery = { clan: clan._id };

	var fields = {
		clanwar: 0,
		clan: 0,
		team: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};
	var sort = options.sort || { date: -1 };
	var limit = 10;
	var skip = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	var cursor = Stats
		.find(query)
		.select(fields)
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	cursor.populate([
		{
			path: 'player',
			select: { _id: 0, nickname: 1 }
		},
		{
			path: 'match',
			select: { _id: 0, id: 1 }
		},
		{
			path: 'map',
			select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
		}
	]);

	return Promise.props({
		data: cursor
			.lean()
			.exec(),
		filtered: Stats.count(query),
		total: Stats.count(totalQuery),
		skip: skip,
		limit: limit
	});
};

exports.clanwars = function clanwars(clan, options) {
	options = options || {};

	var totalQuery = {};

	var query = totalQuery = { 'clans.clan': clan._id };

	var fields = {
		replay: 0,
		server: 0,
		duration: 0,
		stats: 0,
		'clans._id': 0,
		clanwar: 0,
		_id: 0,
		__v: 0,
		createdAt: 0,
		updatedAt: 0
	};
	var sort = options.sort || { date: -1 };
	var limit = 10;
	var skip = 0;

	if (options.skip) {
		var __skip = Number(options.skip);
		if (!isNaN(__skip) && (__skip > 0)) {
			skip = __skip;
		}
	}

	var cursor = Matches
		.find(query)
		.select(fields)
		.sort(sort);

	if (skip) {
		cursor.skip(skip);
	}

	if (limit) {
		cursor.limit(limit);
	}

	cursor.populate([
		{
			path: 'clans.clan',
			select: { _id: 0, abbr: 1, name: 1 }
		},
		{
			path: 'map',
			select: libLang.select(options.lang) + ' -createdAt -updatedAt -__v -_id'
		}
	]);

	return Promise.props({
		data: cursor
			.lean()
			.exec(),
		filtered: Matches.count(query),
		total: Matches.count(totalQuery),
		skip: skip,
		limit: limit
	});
};
