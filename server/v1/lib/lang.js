const config = require('../../configs');
const lang = module.exports;
const languages = config.api.languages;
const langDefault = config.api.langDefault;

lang.select = function (lang, pfx, noLangPfx) {
	pfx = pfx ? pfx + '.' : '';
	languages.indexOf(lang) === -1 && (lang = langDefault);

	return languages.map(function (elem) {
		if (elem !== lang) {
			return '-' + pfx + (noLangPfx ? '' : 'lang.') + elem;
		}
	}).filter(Boolean).join(' ');
};

lang.selectJson = function (lang, pfx, noLangPfx) {
	pfx = pfx ? pfx + '.' : '';
	languages.indexOf(lang) === -1 && (lang = langDefault);

	let select = {};

	if (lang) {
		languages.forEach(function (elem) {
			if (elem !== lang) {
				select[pfx + (noLangPfx ? '' : 'lang.') + elem] = 0;
			}
		});
	}

	return select;
};
