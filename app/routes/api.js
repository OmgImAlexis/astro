var express = require('express'),
    nconf = require('nconf'),
    fs = require('fs'),
    es = require("event-stream"),
    path = require('path'),
    async = require('async'),
    Torrent = require('models/Torrent.js'),
    Category = require('models/Category.js');

module.exports = (function() {
    var app = express.Router();

    app.get('/import', function(req, res){
        res.send('Starting import');
        console.log('Starting import');
        console.time("import");
        var lineNumber = 1;

        // Currently we only support kat
        // To import add the file the imports directory and name it kat.txt
        // This imports around 500 lines per second, hourly dumps take ~30s
        var s = fs.createReadStream(path.resolve('imports/kat.txt')).pipe(es.split()).pipe(es.mapSync(function(line){
            // pause the readstream
            s.pause();

            lineNumber += 1;

            (function(){
                line = line.split('|');
                console.log('processing line ' + lineNumber);
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
                                    // resume the readstream
                                    s.resume();
                                });
                            } else {
                                // resume the readstream
                                s.resume();
                            }
                        });
                    } else {
                        // resume the readstream
                        s.resume();
                    }
                });
            })();
        }).on('error', function(){
            console.log('Error while reading file.');
        }).on('end', function(){
            console.log('Read entirefile.');
            console.timeEnd("import");
        }));
    });

    app.get('/', function(req, res){
        res.json({
            message: 'Welcome to the bitcannon API',
            apiKeyRequired: nconf.get('api:keyNeeded'),
            status: 200
        });
    });

    app.use(function(req, res, next){
        if(nconf.get('api:keyNeeded') === true){
            if(req.query.apiKey === nconf.get('api:key')){
                next();
            } else {
                res.json({
                    message: 'Invalid API key',
                    status: 401
                });
            }
        } else {
            next();
        }
    });

    app.get('/stats', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    app.get('/browse', function(req, res){
        Category.find({}).sort({
            'title': 1
        }).exec(function(err, categories){
            if(err) { console.log(err); }
            async.each(categories, function(category, callback) {
                // This is to check if the calculation is already done for the category
                // If a new one is added and the calculation isn't done then it does it and saves it for later
                if(category.torrentCount < 0 || !category.torrentCount){
                    Torrent.count({
                        category: category._id
                    }).exec(function(err, torrentCount){
                        if(err) { console.log(err); }
                        category.torrentCount = torrentCount;
                        category.save();
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            }, function(err){
                if(err) { console.log(err); }
                res.json({
                    categories: categories
                });
            });
        });
    });

    app.get('/category/:slug', function(req, res){
        async.waterfall([
            function(callback) {
                Category.findOne({
                    slug: req.params.slug
                }).exec(function(err, category){
                    if(err) { callback(err); }
                    if(category){
                        callback(null, category);
                    }
                });
            },
            function(category, callback) {
                Torrent.find({
                    category: category._id
                }).limit(nconf.get('web:torrentsPerPage')).populate('category').sort('_id').exec(function(err, torrents) {
                    if(err) { console.log(err); }
                    callback(null, torrents);
                });
            }
        ], function (err, torrents) {
            if(err) { console.log(err); }
            res.json({
                torrents: torrents
            });
        });
    });

    app.get('/torrent/:infoHash', function(req, res){
        Torrent.findOne({
            infoHash: req.params.infoHash
        }).populate('category').exec(function(err, torrent){
            if(err){ console.log(err); }
            res.json('torrent',{
                torrent: torrent
            });
        });
    });

    app.get('/search', function(req, res){
        console.time('/api/search');
        var limit = req.query.limit || nconf.get('web:torrentsPerPage'),
            sorting = (req.query.sort || nconf.get('web:defaultSearchSorting')).toLowerCase(),
            order = (req.query.order || nconf.get('web:defaultSearchOrder')).toLowerCase(),
            sort = {},
            search = {};
        async.waterfall([
            function(callback) {
                if(req.query.category){
                    Category.findOne({
                        slug: req.query.category
                    }).exec(function(err, category){
                        if(err) { callback(err); }
                        if(category){
                            callback(null, category);
                        }
                    });
                } else {
                    callback(null, null);
                }
            },
            function(category, callback) {
                if(req.query.q){
                    if(category === null){
                        search = { $text: { $search: req.query.q }};
                    } else {
                        search = { $text: { $search: req.query.q }, category: category._id };
                    }
                }
                sort[((sorting === 'seeders' || sorting === 'leechers') ? 'swarm.' : '') + sorting] = (order === 'asc' ? 1 : -1);
                Torrent.find(search, {
                    score: {
                        $meta: 'textScore'
                    }
                }).limit(limit).sort(sort).populate('category').exec(function(err, torrents) {
                    if(err) { console.log(err); }
                    callback(null, torrents);
                });
            }
        ], function (err, torrents) {
            if(err) { console.log(err); }
            console.timeEnd('/api/search');
            res.json({
                torrents: torrents
            });
        });
    });

    return app;
})();
