var https = require('https');
var zlib = require('zlib');
var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Category = require('../app/models/Category.js');
var Torrent = require('../app/models/Torrent.js');

nconf.use('memory');
nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/../config.json')
});

if(nconf.get('database:mongodb:enabled')){
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err){
        if(err){ console.log('Cannot connect to mongodb, please check your config.json'); process.exit(1); }
    });
} else {
    console.log('No database is enabled, please check your config.json'); process.exit(1);
}

// setInterval(function(){
if(nconf.get('downloads:hourly:kat:enabled')){
    https.get('https://kat.cr/api/get_dump/hourly/?userhash=' + nconf.get('downloads:hourly:kat:apiKey'), function(res) {
        // pipe the response into the gunzip to decompress
        var gunzip = zlib.createGunzip();
        res.pipe(gunzip);

        gunzip.on('data', function(data) {
            var lines = data.toString().split(/\r?\n/);
            lines.forEach(function(line){
                line = line.split('|');
                console.log('Processing ' + line[1]);
                Category.findOne({
                    $or: [
                       { 'title': new RegExp(line[2], 'i') },
                       { 'aliases': new RegExp(line[2], 'i') }
                    ]
                }).exec(function(err, category){
                    if(err) {console.log(err);}
                    if(category){
                        Torrent.findOne({
                            infoHash: line[0]
                        }).exec(function(err, exists){
                            if(!exists){
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
                                }, function(err) {
                                    if(err) { console.log(err); }
                                });
                            }
                        });
                    }
                });
            });
        }).on('error', function(err) {
            console.log(err);
        }).on('end', function() {

        });
    }).on('error', function(err) {
        console.log(err);
    });
}
// }, 60000);
