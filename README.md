# Survarium-api

[![Stories in Ready](https://badge.waffle.io/survarium/survarium-api.svg?label=ready&title=Ready)](http://waffle.io/survarium/survarium-api)
[![Stories in Progress](https://badge.waffle.io/survarium/survarium-api.svg?label=In%20Progress&title=In%20Progress)](http://waffle.io/survarium/survarium-api)

API server over [survarium api client](https://github.com/survarium/survarium-api-client)

## Requirements
* `nodejs >= 4`

## Setup
* `git clone https://github.com/survarium/survarium-api.git`
* `cd survarium-api`
* `npm run deps`

## Start
`npm start`

## Usage

### V0
[Available handles](http://survarium.github.io/survarium-api-client/docs/Api.html)

Examples:  

* `curl api.survarium.pro/v0/getClans?offset=0`
* `curl api.survarium.pro/v0/getPublicIdByNickname?nickname=vaseker`
* `curl api.survarium.pro/v0/getMatchStatistic?id=3578606`
* `curl api.survarium.pro/v0/getUserData?pid=15238791817735151910`
* `curl api.survarium.pro/v0/getNicknamesByPublicIds?pids=1606615321417388317&pids=15238791817735151910`
