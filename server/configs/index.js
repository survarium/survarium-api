module.exports = {
	env: process.env.NODE_ENV  || 'development',
	handle: process.env.LISTEN || 3005,

	api: {
		host: 'http://api.survarium.com/',
		keys: {
			public: process.env.SV_API_PUBKEY || 'test',
			private: process.env.SV_API_PRIVKEY || 'test'
		},
		languages: [
			'english',
		    'russian'
		]
	},

	workers: process.env.NODE_WORKERS || require('os').cpus().length,

	v1: {
		db: {
			uri: 'mongodb://localhost/sv-v1'
		}
	}
};
