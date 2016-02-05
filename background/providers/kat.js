'use strict';
var https = require('https');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');

var log = require(__dirname + '/../logging.js');

var Provider = require(__dirname + '/provider.js');

var interval;

class Kat extends Provider {
    run() {
        https.get('https://kat.cr/api/get_dump/hourly/?userhash=' + nconf.get('providers:kat:config:apiKey'), function (res) {
            // Kat
            // torrent_info_hash|torrent_name|torrent_category|torrent_info_url|torrent_download_url|size|category_id|files_count|seeders|leechers|upload_date|verified
            if (res.headers['content-type'] === 'application/x-gzip') {
                // pipe the response into the gunzip to decompress
                var gunzip = zlib.createGunzip();
                res.pipe(gunzip);

                gunzip.on('data', function (data) {
                    var lines = data.toString().split(/\r?\n/);
                    lines.forEach(function (line) {
                        line = line.split('|');
                        if(line.length > 1) {
                            log.info('Processing ' + line[1]);
                            Provider.addTorrent(
                                line[1], // title
                                line[2], // category / aliases
                                line[5], // size
                                line[3], // details
                                {
                                    seeders: line[8],
                                    leechers: line[9]
                                }, // swarm
                                Date.now(), // lastmod
                                Date.now(), // imported
                                line[0] // infoHash
                            )
                        }
                    });
                }).on('error', function (err) {
                    log.warn(err);
                }).on('end', function () {

                });
            } else {
                log.error('Kat API key is invalid');
                clearInterval(interval);
            }
        }).on('error', function (err) {
            log.warn(err);
        });
    }
    startup() {
        if(this.runAtStartup) {
            this.run();
        }
        if (!isNaN(this.duration)) {
            interval = setInterval(this.run, this.duration);
        } else {
            this.log.warn('Invalid duration for provider kat');
        }
    }
}

new Kat('kat').startup();
