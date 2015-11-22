var express = require('express'),
    nconf = require('nconf'),
    async = require('async'),
    lineByLineReader = require('line-by-line'),
    Torrent = require('models/Torrent.js'),
    Category = require('models/Category.js');

module.exports = (function() {
    var app = express.Router();

    app.get('/import', function(req, res){
        res.send('Starting import');
        console.time("import");
        var lr = new lineByLineReader('import.txt');
        lr.on('line', function (line) {
            line = line.split('|');
            Category.findOne({
                $or: [
                   { 'title': new RegExp(line[2], 'i') },
                   { 'aliases': new RegExp(line[2], 'i') }
                ]
            }).exec(function(err, category){
                if(err) {console.log(err);}
                if(category){
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
                    }, function(err, torrent) {
                        if(err) {
                            if(err.code !== 11000){
                                console.log(err);
                            }
                        } else {
                            console.log(torrent.infoHash + ' added');
                        }
                    });
                }
            });
        });
        lr.on('end', function () {
            console.log('All lines are read, file is closed now.');
            console.timeEnd("import");
        });
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
        Category.find({}).sort("title", -1).lean().exec(function(err, categories){
            if(err) { console.log(err); }
            async.each(categories, function(category, callback) {
                Torrent.count({
                    category: category._id
                }).exec(function(err, torrentCount){
                    if(err) { console.log(err); }
                    category.torrentCount = torrentCount;
                    callback(null);
                });
            }, function(err){
                if(err) { console.log(err); }
                res.json({
                    categories: categories
                });
            });
        });
    });

    app.get('/browse/:category', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    app.get('/torrent/:infoHash', function(req, res){
        Torrent.findOne({infoHash: req.params.infoHash}).populate('category').exec(function(err, torrent){
            if(err){ console.log(err); }
            res.json('torrent',{
                torrent: torrent
            });
        });
    });

    app.get('/search/:query', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    app.get('/search/:query/s/:skip', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    app.get('/search/:query/c/:category', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    app.get('/search/:query/c/:category/s/:skip', function(req, res){
        res.send('Welcome to the bitcannon api');
    });

    return app;
})();
