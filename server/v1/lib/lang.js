var config = require('../../configs');
var lang = module.exports;
var languages = config.api.languages;
var langDefault = config.api.langDefault;

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
	var select = {};
	if (lang) {
		languages.forEach(function (elem) {
			if (elem !== lang) {
				select[pfx + (noLangPfx ? '' : 'lang.') + elem] = 0;
			}
		});
	}
	return select;
};
