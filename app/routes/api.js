var express = require('express'),
    nconf = require('nconf'),
    async = require('async'),
    Torrent = require('models/Torrent.js'),
    Category = require('models/Category.js');

module.exports = (function() {
    var app = express.Router();

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
        Torrent.aggregate({
            $group: {
                _id: "$category",
                total: {
                    $sum: 1
                }
            }
        }).exec(function(err, torrentCounts){
            var categories = [];
            async.each(torrentCounts, function(torrentCount, callback) {
                Category.findOne({_id: torrentCount._id}).lean().exec(function(err, category){
                    if(category){
                        category.torrentCount = torrentCount.total;
                        categories.push(category);
                    }
                    callback();
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
