# Survarium API V1

## Requirements
* redis
* mongo

## Environment variables
### SHARED
* `NODE_ENV` – environment
* `LISTEN` – port or socket to attach http server
* `NODE_WORKERS` – amount of workers to spawn
* `SV_API_PUBKEY` – native api public key
* `SV_API_PRIVKEY` – native api private key
* `SV_API_RETRIES` – amount of retries in case of network error
* `DEBUG` – scope for debug logging. e.g `importer:*`
* `DELAY_MIN` – min delay for native api request
* `DELAY_MAX` – max delay for native api request
* `CACHE_AUTH` - cache authorization key
* `CACHE_HOST` - cache host
* `CACHE_PORT` - cache port
* `CACHE_IPV`  - cache IPV protocol. 4 | 6
* `DB_NAME` - database name
* `DB_USER` - database user
* `DB_PASS` - database password
* `DB_HOST` - database host
* `DB_PORT` - database port
* `TELEGRAM_HOSTNAME` – server name for pretty bot notifications
* `TELEGRAM_TOKEN` – bot token

### IMPORTER
Must be running in single process.
* `DEBLOCK` – remove import locks (for unwanted cluster mode)
* `IMPORTER` – amount of matches to import in each data slice
* `IMPORTER_START` - start date of import. e.g: `2015-11-03T18:07:00Z`
* `IMPORTER_MATCH` – start of match import
* `IMPORTER_II_MATCHES` – import matches in parallel mode
* `IMPORTER_II_PLAYERS` – import players in parallel mode
* `CACHE_SFX` – suffix for slice caching

### TELEGRAM
Must be running in single process.
* `TELEGRAM_SERVER` – spawn backend for [@SurvariumBot](https://telegram.me/SurvariumBot)
* `TELEGRAM_BOTAN` – [botan.io](http://botan.io) bot key
* `TELEGRAM_HOOK_KEY` – SSL private key
* `TELEGRAM_HOOK_CERT` – SSL public certificate
* `TELEGRAM_HOOK_HOST` – hostname for webHook listening
* `TELEGRAM_HOOK_PORT` – port for webHook listening
* `TELEGRAM_HOOK_DEL` – unset webHook URL to allow receive updates in pooling mode
