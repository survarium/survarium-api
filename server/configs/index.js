module.exports = {
	env: process.env.NODE_ENV  || 'development',
	handle: process.env.LISTEN || 3005,

	forum: {
		email: process.env.FORUM_EMAIL,
		pass:  process.env.FORUM_PASS
	},

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

	shortLangs: {
		russian: 'ru',
		english: 'en',
		ukrainian: 'ua',
		french: 'fr',
		german: 'de',
		polish: 'pl',
		spanish: 'sp'
	},

	front: process.env.FRONT || 'https://survarium.pro',

	workers: +process.env.NODE_WORKERS || require('os').cpus().length,

	cors: {
		default: 'https://survarium.pro',
		origin: process.env.CORS_ORIGIN || '^https:\/\/survarium\.pro$'
	},

	special: process.env.SPECIAL_KEY,
    keys: {
	    models: (process.env.MODELS_KEY || '').split(',')
    },

	importer: {
		matches: !!process.env.IMPORT_MATCHES,
		messages: !!process.env.IMPORT_MESSAGES
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
			disabled: process.env.TELEGRAM_DISABLED === 'true',
			server: !!process.env.TELEGRAM_SERVER,
			hostname: process.env.TELEGRAM_HOSTNAME || require('os').hostname(),
			token: process.env.TELEGRAM_TOKEN,
			botan: process.env.TELEGRAM_BOTAN,
			channels: (process.env.TELEGRAM_CHANNELS || '').split(','),
			hook: {
				key: process.env.TELEGRAM_HOOK_KEY,
				cert: process.env.TELEGRAM_HOOK_CERT,
				port: process.env.TELEGRAM_HOOK_PORT,
				host: process.env.TELEGRAM_HOOK_HOST,
				del: !!process.env.TELEGRAM_HOOK_DEL
			}
		}
	},
	v2: {
		developers: [
            { id: '58',      name: 'Yava' },
            { id: '65',      name: 'dima' },
            { id: '67',      name: 'Stohe' },
            { id: '68',      name: 'YM2612' },
            { id: '69',      name: 'joewillburn' },
            { id: '76',      name: 'FANTOM' },
            { id: '148',     name: 'Dargalon' },
            { id: '74710',   name: 'Андрияш Козловский' },
            { id: '392554',  name: 'Альбертыч' },
            { id: '457474',  name: 'Survarium DevTeam' },
            { id: '561692',  name: 'Gramb' },
            { id: '95359',   name: 'plecheg' },
            { id: '95344',   name: 'MaJaxed' },
            { id: '1352519', name: 'ivan_vg' },
            { id: '1353973', name: '__VaDiK__' },
            { id: '211392',  name: 'Лаборант' },
            { id: '354018',  name: 'QQcik' },
            { id: '1364745', name: 'Shingan' },
            { id: '1366813', name: 'TriTonn' },
            { id: '1391790', name: 'Survator3000' }
            //{ id: '1080565', name: 'Esmer' }
        ]
	},

	game: {
		langs: ['russian', 'english', 'ukrainian', 'polish'],
        upload: process.env.GAME_UPLOAD_DIR || 'uploads/',
        modes: ['Battery retrieval', 'Team Deathmatch', 'Research', 'Artifact Hunt', 'Slaughter']
	},

	discord: {
		server: process.env.DISCORD_SERVER === 'true',
		token: process.env.DISCORD_TOKEN,
		devChannel: process.env.DISCORD_DEVCHANNEL || 'devmessages',
		pmChannels: process.env.DISCORD_PM_CHANNELS ? process.env.DISCORD_PM_CHANNELS.split(',') : ['Vaseker']
	},

    steam: {
	    api: 'https://api.steampowered.com',
	    appid: process.env.STEAM_APPID || 355840,
        apikey: process.env.STEAM_APIKEY
    }
};
