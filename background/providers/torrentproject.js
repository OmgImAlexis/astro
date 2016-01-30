var https = require('https');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Category = require('models/Category.js');
var Torrent = require('models/Torrent.js');

var bunyan = require('bunyan');

// Sets up Bunyan to log to the same file as the BitCannon Server - Could this cause problems?
var log = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('../../package.json').version,
    streams: [
        {
            level: 'info',
            stream: process.stdout // log INFO and above to stdout
        }, {
            level: 'error',
            // log ERROR and above to a file
            path: path.resolve('../' + nconf.get('logs:location'))
        }
    ]
});

if(nconf.get('database:mongodb:enabled')){
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err){
        // We should be able to ignore this error. As far as I understand, this error isn't actually an error and just means there are still open connection to MongoDB. Mongoose
        // should still work fine.
        if (err) {
            if((err.message) !== 'Trying to open unclosed connection.') {
                console.log('Cannot connect to mongodb, please check your config.json');
                process.exit(1);
            }
        }
    });
} else {
    console.log('No database is enabled, please check your config.json'); process.exit(1);
}

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
        }).on('error', function (err) {
            console.log(err);
        });
    }, duration);
} else {
    console.warn('Invalid duration for provider torrentproject'); // To Do: Add proper logging here
}