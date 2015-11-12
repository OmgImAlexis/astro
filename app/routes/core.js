var express = require('express'),
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

    return app;
})();
