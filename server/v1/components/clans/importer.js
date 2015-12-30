'use strict';

const debug = require('debug')('importer:clans');
const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const config = require('../../../configs');
const ClanRoles = db.model('ClanRoles');

const languages = config.api.languages;

const CACHEKEY = 'clans:load';
const EXPIRE = 60 * 5;
const logKey = 'clans:';

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
							self.create(assignDataToModel(fetched)) :
							self.update(assignDataToModel(fetched, clan)).exec()
								.then(function () {
									return clan;
								});
					});
			}
			debug(`clan ${id} is fresh`);
			return clan;
		});
}

function assignRole(player) {

}

module.exports = {
	load: load,
	fetch: fetch,
	assignRole: assignRole
};
