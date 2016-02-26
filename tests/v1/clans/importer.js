'use strict';

var test = require('tape');
var Promise = require('../../../server/v1/node_modules/bluebird');

var db = require('../../../server/v1/lib/db');
var cache = require('../../../server/v1/lib/cache');

var importer = require('../../../server/v1/components/clans/importer');
var model = importer.model;

test('clans.importer.clanwar', (t) => {
	model
		.remove({}, (err) => {
			if (err) {
				return t.end(err);
			}

			let matchMock = {
				_id: '569af5a5cb9c0c46ca45ba16',
				id: 1
			};

			let statsMock = {
				'569af5a5cb9c0c46ca45be16': {
					team: 0,
					level: 7,
					match: matchMock._id,
					score  : 327,
					kills  : 14,
					dies   : 5,
					victory: true,

					headshots    : 1,
					grenadeKills : 1,
					meleeKills   : 1,
					artefactKills: 1,
					pointCaptures: 1,
					boxesBringed : 1,
					artefactUses : 1
				},
				'569af5a5cb9c0c46ca45be17': {
					team: 1,
					level: 7,
					match: matchMock._id,
					score  : 100,
					kills  : 5,
					dies   : 14,
					victory: false,

					headshots    : 2,
					grenadeKills : 0,
					meleeKills   : 1,
					artefactKills: 1,
					pointCaptures: 0,
					boxesBringed : 1,
					artefactUses : 1
				}
			};

			let clansMock = [
				{ abbr: 'WINNER', name: 'Good clan', id: 1 },
				{ abbr: 'LOOSER', name: 'Shitty clan', id: 2 }
			];

			Promise.all(clansMock.map(function (clan) {
				return model.create(clan);
			}))
				.then(function (clans) {
					return importer
						.clanwar({
							matchData: {
								is_clan: false
							},
							match: matchMock
						})
						.then(function (result) {
							t.equal(result, undefined, 'should not execute when not clanwar');
							return clans;
						});
				})
				.then(function (clans) {
					return importer
						.clanwar({
							matchData: {
								is_clan: true,
								clan_match: [clans[0].id, clans[1].id]
							},
							match: matchMock,
							stats: statsMock
						})
						.then(function (result) {
							let _clan1 = result[0];
							let _clan2 = result[1];

							return model
								.find({ _id: { $in: [_clan1.clan, _clan2.clan] } }, { abbr: 1, total: 1, id: 1, matches: 1 })
								.lean()
								.then(function (clans) {
									t.equal(clans.length, 2, 'should be 2 clans added');

									t.equal(_clan1.win, true, 'should be first clan winner');
									t.equal(_clan2.win, false, 'should be second clan looser');

									t.equal(_clan1.total.matches, 1, 'should be match count');
									t.equal(_clan1.total.victories, 1, 'should be victories count');

									t.equal(_clan2.total.victories, 0, 'should be looses count');

									t.equal(_clan1.total.kills, 14, 'should be kills count');
									t.equal(_clan2.total.dies, 14, 'should be dies count');

									t.equal(_clan1.total.score, 327, 'should be score');

									let clan1 = clans[0].id === clansMock[0].id ? clans[0] : clans[1];
									let clan2 = clans[1].id === clansMock[1].id ? clans[1] : clans[0];

									t.notEqual(clan1, clan2, 'should be proper clan assign');

									t.equal(clan1.total.kd, 2.8, 'should be proper kd1');
									t.equal(clan2.total.kd, 0.36, 'should be proper kd2');

									t.equal(clan1.total.winRate, 100, 'should be proper winrate1');
									t.equal(clan2.total.winRate, 0, 'should be proper winrate2');

									t.equal(clan1.matches.length, 1, 'should be matches relation1');
									t.equal(clan2.matches.length, 1, 'should be matches relation2');

									t.end();
								});
						});
				})
				.catch(t.end);
		});
});

test('clans.importer.public', (t) => {
	model
		.remove({}, (err) => {
			if (err) {
				return t.end(err);
			}

			let matchMock = {
				_id: '569af5a5cb9c0c46ca45ba16',
				id: 1
			};

			let statMock = [
				{
					_id: '569af5a5cb9c0c46ca45be16',
					team: 0,
					level: 7,
					match: matchMock._id,
					score  : 327,
					kills  : 14,
					dies   : 5,
					victory: true,

					headshots    : 4,
					grenadeKills : 2,
					meleeKills   : 1,
					artefactKills: 0,
					pointCaptures: 5,
					boxesBringed : 2,
					artefactUses : 7
				},
				{
					_id: '569af5a5cb9c0c46ca45be17',
					team: 1,
					level: 7,
					match: matchMock._id,
					score  : 100,
					kills  : 5,
					dies   : 14,
					victory: false,

					headshots    : 2,
					grenadeKills : 0,
					meleeKills   : 1,
					artefactKills: 1,
					pointCaptures: 0,
					boxesBringed : 1,
					artefactUses : 1
				}
			];

			let clanMock = { abbr: 'FOO', name: 'FOOBAR', id: 3 };

			model.create(clanMock)
				.then(function (clan) {
					return Promise.all(statMock.map(function (stat) {
						return importer.publicStat(clan._id, stat);
					}))
					.then(function () {
						return model.findOne({ _id: clan._id }, { abbr: 1, totalPublic: 1, stats: 1 });
					})
					.then(function (clan) {
						let totals = clan.totalPublic;
						t.equal(clan.stats.length, 2, 'should be stats relation');

						t.equal(totals.matches, 2, 'should be matches(stats) count');
						t.equal(totals.victories, 1, 'should be victories count');

						t.equal(totals.kills, 19, 'should be kills count');
						t.equal(totals.dies, 19, 'should be dies count');

						t.equal(totals.score, 427, 'should be total score');

						t.equal(totals.headshots, 6, 'should be headshots count');
						t.equal(totals.grenadeKills, 2, 'should be grenadeKills count');
						t.equal(totals.meleeKills, 2, 'should be meleeKills count');
						t.equal(totals.artefactKills, 1, 'should be artefactKills count');
						t.equal(totals.pointCaptures, 5, 'should be pointCaptures count');
						t.equal(totals.boxesBringed, 3, 'should be boxesBringed count');
						t.equal(totals.artefactUses, 8, 'should be artefactUses count');

						t.equal(totals.scoreAvg, 214, 'should be avgScore');
						t.equal(totals.kd, 1, 'should be kd');
						t.equal(totals.winRate, 50, 'should be winrate');

						t.end();
					});
				})
				.catch(t.end);
		});
});

test.onFinish(function () {
	db.close();
	cache.disconnect();
});
