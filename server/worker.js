'use strict';

require('newrelic');

const config = require('./configs');

var express = require('express');
var app = express();

app.set('env', config.env);
app.disable('x-powered-by');
app.enable('trust proxy');

app.use(require('./router'));

app.listen(config.handle, function (err) {
	if (err) {
		throw err;
	}
	console.log(`app [${process.pid}] listening handle`, config.handle);
});
