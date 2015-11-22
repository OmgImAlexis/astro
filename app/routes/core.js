var express = require('express'),
    nconf = require('nconf'),
    async = require('async'),
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
                res.render('browse', {
                    categories: categories
                });
            });
        });
    });

    app.get('/category/:slug', function(req, res){
        async.waterfall([
            function(callback) {
                Category.findOne({slug: req.params.slug}).exec(function(err, category){
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
            res.render('search', {
                torrents: torrents
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
                torrents: torrents
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
