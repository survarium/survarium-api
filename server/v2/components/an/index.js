'use strict';

const got = require('got');
const zlib = require('zlib');
const Readable = require('stream').Readable;

const router = require('express').Router();
const config = require('../../../configs');

/*function Cache () {
    this.cache = {};
}

Cache.prototype.set = (key, val, ttl) => {
    this.cache[key] = val;
    
    setTimeout(() => {
        this.cache[key] = null;
    }, ttl);
};

Cache.prototype.get = (key) => {
    return this.cache[key];
};*/

function patchCookie(hostname, an) {
    let cookie = an.headers && an.headers['set-cookie'];
    
    if (cookie) {
        let cookieDomain = /domain=an\.yandex\.ru;/;
        
        an.headers['set-cookie'] = cookie.forEach(cook => {
            if (cookieDomain.test(cook)) {
                an.headers['set-cookie'].push(cook.replace(cookieDomain, `domain=${hostname};`));
            }
        });
    }
    
    return an;
}

function answer(headers, res, an) {
    let body = new Readable;
    body.push(an.body);
    body.push(null);
    
    if (an.headers['content-encoding'] === 'gzip') {
        delete an.headers['content-length'];
        delete an.headers['content-encoding'];
        
        if (headers['accept-encoding'] && headers['accept-encoding'].match(/(gzip|deflate)/)) {
            let encoding = RegExp.$1;
            
            an.headers['content-encoding'] = encoding;
            res.set(an.headers);
            
            switch (encoding) {
                case 'deflate':
                    return body.pipe(zlib.createDeflate()).pipe(res);
                case 'gzip':
                    return body.pipe(zlib.createGzip()).pipe(res);
            }
        }
        
    }
    
    res.set(an.headers);
    
    return body.pipe(res);
}

router.all('*', (req, res, next) => {
    if (config.env !== 'production' && req.path.match(/^\/page/)) {
        req.query['page-ref'] = req.query['target-ref'] = req.headers.referer = req.query['target-ref']
            .replace('http:', 'https:')
            .replace('.dev', '.pro')
            .replace(/:\d+/, '');
    }
    
    let headers = req.headers;
    let incomingHost = headers.host;
    let hostname = req.hostname;
    
    headers.host = 'an.yandex.ru';
    
    headers.pragma = headers['cache-control'] = 'no-cache';
    
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    
    let flow = got(`https://an.yandex.ru${req.path}`,
        {
            method: req.method,
            query: req.query,
            retries: 0,
            headers: headers
        });
    
    if (req.path === '/system/context.js') {
        flow = flow
            .then(an => {
                an.body = an.body.replace(/an\.yandex\.ru/g, `${incomingHost}${req.baseUrl}`);
                
                if (!req.secure) {
                    an.body = an.body.replace(/https:/g, 'http:');
                }
                
                return an;
            });
    } else if (req.path.match(/\/resource\/context_static/)) {
        flow = flow
            .then(an => {
                an.body = an.body
                    .replace(/(http(s)?:\/\/)?an\.yandex\.ru/g, `http${req.secure ? 's' : ''}://${incomingHost}${req.baseUrl}`)
                    .replace(/(jserrlog:)"https:\/\/an([^"]*)"/, '$1"https://an.yandex.ru$2"');
                
                return an;
            });
    }
    
    return flow
        .then(patchCookie.bind(null, hostname))
        .then(answer.bind(null, headers, res))
        .catch(next);
});

module.exports = router;

