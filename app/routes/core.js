var express = require('express'),
    nconf = require('nconf'),
    async = require('async'),
    _ = require('underscore'),
    Torrent = require('models/Torrent.js'),
    Category = require('models/Category.js');

module.exports = (function() {
    var app = express.Router();

    app.use(function(req, res, next){
        Torrent.count().exec(function(err, count){
            if(err){ console.log(err); }
            res.locals.stats = {};
            res.locals.stats.count = count;
            next();
        });
    });

    app.get('/', function(req, res){
        Category.find().exec(function(err, categories){
            if(err){ console.log(err); }
            res.render('index',{
                categories: categories
            });
        });
    });

    app.get('/about', function(req, res){
        res.render('about');
    });

    app.get('/browse', function(req, res){
        Torrent.aggregate({
            $group: {
                _id: "$category",
                total: {$sum: 1}
            }
        }).exec(function(err, torrentCounts){
            if(err) { console.log(err); }
            Category.find({}).lean().exec(function(err, categories){
                if(err) { console.log(err); }
                categories = categories.map(function(category, i){
                    var obj = _.where(torrentCounts, {_id: categories[i]._id});
                    category.totalTorrents = obj.length ? obj[0].total : 0; // This should set the totalTorrents but seems to only return []
                    return category;
                });
                res.render('browse', {
                    categories: categories,
                    torrentCounts: torrentCounts
                });
            });
        });
    });

    app.get('/search', function(req, res){
        var limit = req.query.limit || nconf.get('web:torrentsPerPage'), search = {};
        async.waterfall([
            function(callback) {
                if(req.query.category){
                    Category.findOne({slug: req.query.category}).exec(function(err, category){
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
                Torrent.find(search, {
                    score: {
                        $meta: 'textScore'
                    }
                }).limit(limit).populate('category').exec(function(err, torrents) {
                    if(err) { console.log(err); }
                    callback(null, torrents);
                });
            }
        ], function (err, torrents) {
            if(err) { console.log(err); }
            res.render('search', {
                torrents: torrents,
                search: search
            });
        });
    });

    app.get('/torrent/:infoHash', function(req, res){
        Torrent.findOne({infoHash: req.params.infoHash}).populate('category').exec(function(err, torrent){
            if(err){ console.log(err); }
            res.render('torrent',{
                torrent: torrent
            });
        });
    });

    return app;
})();
