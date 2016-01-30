var https = require('https');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Category = require('models/Category.js');
var Torrent = require('models/Torrent.js');

var bunyan = require('bunyan');

var log = bunyan.logger;

var duration = undefined;

switch(nconf.get('providers:torrentproject:config:duration')) {
    case '@hourly':
        duration = 60000;
        break;
    case '@daily':
        duration = 1440000;
        break;
    default:
        duration = Number(nconf.get('providers:torrentproject:config:duration'));
}

if(!isNaN(duration)) {
    setInterval(function() {
        https.get('https://torrentproject.se/hourlydump.txt.gz', function (res) {
            // torrentproject
            // torrent_info_hash|torrent_name|torrent_category|torrent_info_url|torrent_download_url|size|category_id|files_count|seeders|leechers|upload_date|verified

            // pipe the response into the gunzip to decompress
            var gunzip = zlib.createGunzip();
            res.pipe(gunzip);

            gunzip.on('data', function (data) {
                var lines = data.toString().split(/\r?\n/);
                lines.forEach(function (line) {
                    line = line.split('|');
                    log.info('Processing ' + line[1]);
                    Category.findOne({
                        $or: [
                            {'title': new RegExp(line[2], 'i')},
                            {'aliases': new RegExp(line[2], 'i')}
                        ]
                    }).exec(function (err, category) {
                        if (err) {
                            log.error(err);
                        }
                        if (category) {
                            Torrent.findOne({
                                infoHash: line[0]
                            }).exec(function (err, exists) {
                                if (!exists) {
                                    Torrent.create({
                                        title: line[1],
                                        category: category._id,
                                        size: line[5],
                                        details: [
                                            line[3]
                                        ],
                                        swarm: {
                                            seeders: line[8],
                                            leechers: line[9]
                                        },
                                        lastmod: Date.now(),
                                        imported: Date.now(),
                                        infoHash: line[0]
                                    }, function (err) {
                                        if (err) {
                                            log.warn(err);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }).on('error', function (err) {
                log.warn(err);
            }).on('end', function () {

            });
        }).on('error', function (err) {
            log.warn(err);
        });
    }, duration);
} else {
    log.warn('Invalid duration for provider torrentproject');
}