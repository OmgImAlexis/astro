var express = require('express'),
    mongoose = require('mongoose'),
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

    app.get('/search', function(req, res){
        Torrent.find().exec(function(err, torrents){
            if(err){ console.log(err); }
            res.render('search',{
                torrents: torrents
            });
        });
    });

    app.get('/torrent/:infoHash', function(req, res){
        Torrent.findOne({infoHash: req.params.infoHash}).exec(function(err, torrent){
            if(err){ console.log(err); }
            res.render('torrent',{
                torrent: torrent
            });
        });
    });

    app.post('/search', function(req, res){
        // var search = req.query;
        Torrent.find().exec(function(err, categories){
            if(err){ console.log(err); }
            res.render('index',{
                categories: categories
            });
        });
    });

    return app;
})();
