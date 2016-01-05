'use strict';

const debug = require('debug')('importer:clans');
const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const ClanRoles = db.model('ClanRoles');

const CACHEKEY = 'clans:load';
const EXPIRE = 60 * 5;
const logKey = 'clans:';

/**
 * Fetch data from API
 * Cacheable
 * @param {Object}  params
 * @param {Number}  params.id  Clan ID
 * @returns {Object|Promise}
 */
function fetch(params) {
	debug(`loading clan ${params.id} from source`);
	var key = `${CACHEKEY}:${params.id}`;
	return cache.get(key)
		.then(function (clanInfo) {
			if (!clanInfo) {
				return Promise.props({
						clan: apiNative.getClanInfo({ id: params.id }, { delay: apiNative.delay }),
						members: apiNative.getClanMembers({ id: params.id }, { delay: apiNative.delay * 1.5 })
					})
					.tap(function (clanInfo) {
						debug(`clan ${params.id} loaded from API`);
						return cache.set(key, JSON.stringify(clanInfo), 'EX', EXPIRE);
					});
			}
			debug(`clan ${params.id} loaded from cache`);
			return JSON.parse(clanInfo);
		});
}

/**
 * Map API data to database model schema
 * @param {Object} source   API data
 * @param {Object} [update] Document if exists
 * @returns {Object}
 */
function assignDataToModel(source, update) {
	var data = source.clan.clan_info;
	var result = {
		name: data.name,
		level: data.level,
		elo: data.elo
	};
	if (!update) {
		result.id = source.clan.clan_id;
		result.abbr = data.abbreviation;
	} else {
		if (update.abbr !== data.abbreviation) {
			result.abbr = data.abbreviation;
		}
	}
	return result;
}

/**
 * Return clan from database
 * Created or updated from API if needed
 * @param {Object}  params
 * @param {Number}  params.id  Clan ID
 * @returns {Object|Promise}
 */
function load(params) {
	debug(`load ${params.id}`);

	var id = params.id;
	var self = this;
	return self
		.findOne({ id: id })
		.then(function (clan) {
			if (!clan || ((new Date()).getTime() - clan.updatedAt.getTime() > EXPIRE * 1000)) {
				var isNew = !clan;
				debug(`clan ${id} being ${isNew ? 'created' : 'updated'}`);
				return fetch(params)
					.then(function (fetched) {
						return isNew ?
							self
								.create(assignDataToModel(fetched))
								.catch(function (err) {
									if (err.code === 11000) {
										debug(`clan ${id} should be created, but its already exists`);
										return self.findOne({ id: id });
									}
									throw err;
								}):
							self
								.update({ id: id }, { $set: assignDataToModel(fetched, clan) })
								.exec()
								.then(function () {
									return clan;
								});
					});
			}
			debug(`clan ${id} is fresh`);
			return clan;
		});
}

module.exports = {
	load: load,
	fetch: fetch
};
