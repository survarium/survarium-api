module.exports = {
	env: process.env.NODE_ENV  || 'development',
	handle: process.env.LISTEN || 3005,

	api: {
		host: 'http://api.survarium.com/',
		keys: {
			public : process.env.SV_API_PUBKEY  || 'test',
			private: process.env.SV_API_PRIVKEY || 'test'
		},
		languages: [
			'english',
		    'russian'
		],
		langDefault: 'english',
		retries: 2 || process.env.SV_API_RETRIES
	},

	workers: +process.env.NODE_WORKERS || require('os').cpus().length,

	cors: {
		origin: process.env.CORS_ORIGIN || 'https://survarium.pro'
	},

	v1: {
		db: {
			uri: `mongodb://
					${process.env.DB_USER || ''}
					${process.env.DB_PASS ? ':' + process.env.DB_PASS + '@' : ''}
					${process.env.DB_HOST || 'localhost'}
					${process.env.DB_PORT ? ':' + (+process.env.DB_PORT) : ''}/
					${process.env.DB_NAME || 'sv-v1'}`
				.replace(/\t|\r|\n/gm, '')
		},
		cache: {
			auth:  process.env.CACHE_AUTH,
			port: +process.env.CACHE_PORT || 6379,
			host:  process.env.CACHE_HOST || '127.0.0.1',
			ipv : +process.env.CACHE_IPV  || 4,
			sfx :  process.env.CACHE_SFX  || ''
		},
		importer: !!process.env.IMPORTER,
		telegram: {
			server: !!process.env.TELEGRAM_SERVER,
			hostname: process.env.TELEGRAM_HOSTNAME || require('os').hostname(),
			token: process.env.TELEGRAM_TOKEN,
			botan: process.env.TELEGRAM_BOTAN,
			hook: {
				key: process.env.TELEGRAM_HOOK_KEY,
				cert: process.env.TELEGRAM_HOOK_CERT,
				port: process.env.TELEGRAM_HOOK_PORT,
				host: process.env.TELEGRAM_HOOK_HOST,
				del: !!process.env.TELEGRAM_HOOK_DEL
			}
		}
	}
};
