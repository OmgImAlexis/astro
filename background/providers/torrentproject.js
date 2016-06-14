/**
 * @file Provides a class for Torrentproject
 * @todo Move the startup code to the provider baseclass since it's duplicated across providers
 * @todo Don't call TorrentProject.run() if a run is already in progress. If a run is in progress
 * then don't do anything until the gunzip.on('end') event is triggered.
 */

'use strict';

var http = require('http');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');
var os = require('os');

var log;

var Provider = require(__dirname + '/provider.js');

var interval;

var start, end;

/**
 * Class representing a {@link https://torrentproject.se|Torrentproject} archive provider
 * @extends Provider
 */
class TorrentProject extends Provider {
    constructor(provider) {
        super(provider);
        log = this.log;
    }
    run() {
        http.get(nconf.get('providers:torrentproject:config:url'), function (res) {
            // torrentproject
            // torrent_info_hash|torrent_name|torrent_category|torrent_info_url|torrent_download_url|size|category_id|files_count|seeders|leechers|upload_date|verified

            // pipe the response into the gunzip to decompress
            var gunzip = zlib.createGunzip();
            res.pipe(gunzip);
            start = process.hrtime();
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
                        );
                    }
                });
            }).on('error', function (err) {
                log.warn(err);
            }).on('end', function () {
                end = process.hrtime(start);
                log.info('elapsed time: ' + end[0] + ' seconds and ' + end[1] + 'nanoseonds.');
            });
        }).on('error', function (err) {
            log.warn(err); // 100000
        });
    }

    startup() {
        if(this.runAtStartup) {
            this.run();
        }
        if (!isNaN(this.duration)) {
            interval = setInterval(this.run, this.duration);
        } else {
            this.log.warn('Invalid duration for provider torrentproject');
        }
    }
}

new TorrentProject('torrentproject').startup();
