const config = require('../../configs');
const api = new (require('survarium-api-client').v0)({ keyPriv: config.api.keys.private, keyPub: config.api.keys.public });

module.exports = api;
