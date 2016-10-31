'use strict';

const path = require('path');
const Promise = require('bluebird');

const config = require('../../../../configs');
const Versions = require('../models/versions');
const Items = require('../models/items');
const UiProps = require('../models/ui_properties');
const Factions = require('../models/factions');
const Modifications = require('../models/modifications');
const db = Versions.db;

const VERSION = process.env.VERSION;
const VERSION_DATE = process.env.VERSION_DATE;

if (!VERSION || !VERSION_DATE) {
	console.error('no env.VERSION or env.VERSION_DATE provided');
	process.exit(2);
}

const basePath = path.join(__dirname, `../../../../../game`, VERSION);

db.once('connected', function () {
	Versions
		.findOneAndUpdate(
			{ _id: VERSION },
			{ _id: VERSION, date: new Date(VERSION_DATE) },
			{ new: true, upsert: true }
		)
		.then(version => {
			console.log(`version ${version.id} created`);
			return build(version);
		});

	const INDEX = require(path.join(basePath, 'gameplay', 'db_static_dictionaries'));
	const STATIC_GAME_PARAMS = require(path.join(basePath, 'gameplay', 'static_game_parameters'));
    const MODIFICATIONS = require(path.join(basePath, 'gameplay', 'items', 'modifications', 'modifications'));
	const LOCALIZATION = config.game.langs.map(lang => {
		return {
			lang: config.shortLangs[lang],
			data: require(path.join(basePath, 'localization', lang, 'localization')).strings
		};
	});

	const ITEMS = INDEX['items_dict'];

	function copy(fields, from, to) {
		fields.forEach(nav => {
			nav = nav.split('.');
			let src = from;
			let dst = to;

			for (let i = 0; i < nav.length - 1; i++) {
				let field = nav[i];
				src = src[field];
				if (src) {
					dst = dst[field] || (dst[field] = {});
				}
			}

			let field = nav[nav.length - 1];
			if (src && src[field]) {
				dst[field] = src[field];
			}
		});

		return to;
	}

	function localize(locals) {
		return LOCALIZATION.reduce((result, locale) => {
			result[locale.lang] = Object.keys(locals).reduce((result, key) => {
				let translation = locale.data[locals[key]];
				if (translation && translation !== 'ОПИСАНИЕ НЕ ГОТОВО!!!') {
					result[key] = translation;
				}

				return result;
			}, {});

			return result;
		}, {});
	}

	function build(version) {
		function buildItem(ITEM) {
			return new Promise((resolve) => {
				const item = require(path.join(basePath, ITEM['cfg_name'].replace(/\.options$/, '.json')));
				const types = item.parameters.type && item.parameters.type.split('_');
				const type = types && types[0];
				const subType = types && types[1];
				const modType = types && types[2];

				let base = {
					_id: ITEM['dict_id'],
					langs: localize(item['ui_desc']['text_descriptions']),
					t1: type,
					t2: subType,
					t3: modType
				};

				copy([
					'item_category',
				    'name',
				    'is_stack'
				], ITEM, base);

				let opt = {
					ver: version.id
				};

				copy(['is_premium'], ITEM, opt);

                //TODO: default_modifications typeof {} => []

				switch (type) {
					case 'wpn':
						let attaches = item.attaches;
						item.attaches = attaches && Object.keys(attaches).reduce((result, key) => {
								let attach = attaches[key];

								delete attach.locators;

								result[key] = attach;
								return result;
							}, {});

						copy([
							'parameters',
							'default_modifications',
							'recoil',
							'aim_recoil',
							'compatible_ammo',
							'dispersion',
							'ui_desc.combat_log_icon',
							'ui_desc.icon',
							'ui_desc.props_list',
						    'upgrade_possibilities.upgrade_scheme',
						    'upgrade_possibilities.levels',
						    'upgrade_possibilities.upgrade_unlock_cost',
						    'upgrade_possibilities.total_kills',
						    'upgrade_possibilities.default_attaches',
							'attaches'
						], item, opt);
						break;
					case 'grenade':
						copy([
							'parameters',
						    'ui_desc.hud_icon',
							'ui_desc.icon'
						], item, opt);
						break;
					case 'arm':
						copy([
							'parameters',
						    'default_modifications',
						    'ui_desc.props_list',
							'ui_desc.icon',
							'ui_desc.props_list',
						    'hit_params',
						    'data'
						], item, opt);
						break;
					case 'ammo':
						copy([
							'parameters',
						    'data',
							'ui_desc.icon'
						], item, opt);
						break;
					case 'drugs':
						copy([
							'parameters',
						    'data',
							'ui_desc.icon'
						], item, opt);
						break;
					case 'trap':
						copy([
							'parameters',
							'ui_desc.hud_icon',
							'ui_desc.icon',
							'data.placement',
						    'data.trap',
						    'data.destroyable',
						    'data.mine',
						    'data.type',
						    'scanner.life_time',
						    'scanner.scan_interval',
							'scanner.activation_time'
						], item, opt);
						break;
					default:
						return resolve();
						break;
				}

				base[`versions.${opt.ver.replace(/\./g, '_dot_')}`] = opt;

				base = {
					$set: base
				};

				Items
					.findOneAndUpdate({ _id: base.$set._id }, base, { new: true, upsert: true })
					.then(resolve)
					.catch(err => {
						console.error(err.message);
						console.log(base);
						resolve();
					});
			});
		}

		function buildUiProperties(props) {
			return props.map(prop => {
				let item = copy([
					'direction',
					'min_value',
                    'max_value',
                    'comparable',
                    'postfix',
					'mod_type'
				], prop, {
					_id: prop.prop_id,
					name: prop.prop_name,
					langs: localize({ name: prop.prop_name })
				});
				return UiProps.findOneAndUpdate({ _id: prop.prop_id }, item, { new: true, upsert: true })
			});
		}

		function buildFactions(factions) {
			let keys = Object.keys(factions);
			return keys.map(key => {
				let faction = factions[key];
				let item = {
					_id: faction.id,
					langs: localize({ name: faction.name }),
					levels: faction.levels && faction.levels.map(level => {
						return {
							value: level.value,
							langs: localize({ name: level.name, unlock_message: level.unlock_message })
						};
					})
				};

				return Factions.findOneAndUpdate({ _id: faction.id }, item, { new: true, upsert: true })
			});
		}

		function reduceProps(propsList) {
		    return propsList.reduce((props, prop) => {
		        prop.langs = localize({ name: prop.prop_name });

		        props[prop['prop_id']] = prop;
		        return props;
            }, {});
        }

		function buildModifications(modifications, propsList) {
		    const props = reduceProps(propsList);

		    return modifications.map(item => {
                item._id = item.id;
                delete item.id;

                let info = item['lobby_info'];
                if (info) {
                    item['lobby_info'] = Object.keys(info).map(key => {
                        return {
                            prop: key,
                            value: info[key]
                        };
                    });

                    item.value = Number(item['lobby_info'][0]['value']);
                }

                if (item['ui_desc'] && item['ui_desc']['props_list']) {
                    if (item['ui_desc']['props_list'].length) {
                        let prop = item['ui_desc']['props_list'][0];
                        let param = props[prop['prop_id']];

                        item.langs = localize({ name: param['prop_name'] });
                        item.postfix = param.postfix;
                    } else {
                        delete item['ui_desc']['props_list'];
                    }
                }

                return Modifications.findOneAndUpdate({ _id: item._id }, item, { new: true, upsert: true });
            });
        }

		return Promise
			.all([].concat(
			    Promise
                    .all(ITEMS.map(buildItem))
                    .tap(() => console.log('items done')),
				Promise
                    .all(buildUiProperties(STATIC_GAME_PARAMS.ui_properties))
                    .tap(() => console.log('static params done')),
                /*Promise
                    .all(buildFactions(INDEX.factions_dict))
                    .tap(() => console.log('factions done')),*/
                Promise
                    .all(buildModifications(MODIFICATIONS.modifications, STATIC_GAME_PARAMS.ui_properties))
                    .tap(() => console.log('modifications done'))
			))
			.then(() => {
				console.log('game import done');
				db.close();
			});
	}
});
