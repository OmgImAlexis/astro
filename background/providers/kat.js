var https = require('https');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Category = require('../../app/models/Category.js');
var Torrent = require('../../app/models/Torrent.js');

nconf.use('memory');
nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/../../config.json')
});

if(nconf.get('database:mongodb:enabled')){
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err){
        if(err){ console.log('Cannot connect to mongodb, please check your config.json'); process.exit(1); }
    });
} else {
    console.log('No database is enabled, please check your config.json'); process.exit(1);
}

var duration = undefined;

switch(nconf.get('providers:kat:config:duration')) {
    case '@hourly':
        duration = 60000;
        break;
    case '@daily':
        duration = 1440000;
        break;
    default:
        duration = Number(nconf.get('providers:kat:config:duration'));
}

if(!isNaN(duration)) {
    setInterval(function () {
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
                        console.log('Processing ' + line[1]);
                        Category.findOne({
                            $or: [
                                {'title': new RegExp(line[2], 'i')},
                                {'aliases': new RegExp(line[2], 'i')}
                            ]
                        }).exec(function (err, category) {
                            if (err) {
                                console.log(err);
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
                                                console.log(err);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }).on('error', function (err) {
                    console.log(err);
                }).on('end', function () {

                });
            } else {
                console.log('Kat API key is invalid');
                process.exit(1);
            }
        }).on('error', function (err) {
            console.log(err);
        });
    }, duration);
} else {
    console.warn('Invalid duration for provider kat'); // To Do: Add proper logging here
}