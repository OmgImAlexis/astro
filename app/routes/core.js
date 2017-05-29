const express = require('express');
const nconf = require('nconf');
const async = require('async');
const Torrent = require('../models/Torrent.js');
const Category = require('../models/Category.js');

module.exports = (function() {
    const router = new express.Router();

    router.use((req, res, next) => {
        Torrent.count().exec((err, count) => {
            if (err) {
                console.log(err);
            }
            res.locals.stats = {};
            res.locals.stats.count = count;
            next();
        });
    });

    router.get('/', (req, res) => {
        Category.find().exec((err, categories) => {
            if (err) {
                console.log(err);
            }
            res.render('index', {
                categories
            });
        });
    });

    router.get('/about', (req, res) => {
        res.render('about');
    });

    router.get('/browse', (req, res) => {
        Category.find({}).sort({
            title: 1
        }).exec((err, categories) => {
            if (err) {
                console.log(err);
            }
            async.each(categories, (category, callback) => {
                if (category.torrentCount < 0) {
                    Torrent.count({
                        category: category._id
                    }).exec((err, torrentCount) => {
                        if (err) {
                            console.log(err);
                        }
                        category.torrentCount = torrentCount;
                        category.save();
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            }, err => {
                if (err) {
                    console.log(err);
                }
                res.render('browse', {
                    categories
                });
            });
        });
    });

    router.get('/category/:slug', (req, res) => {
        async.waterfall([
            function(callback) {
                Category.findOne({
                    slug: req.params.slug
                }).exec((err, category) => {
                    if (err) {
                        callback(err);
                    }
                    if (category) {
                        callback(null, category);
                    }
                });
            },
            function(category, callback) {
                Torrent.find({
                    category: category._id
                }).limit(nconf.get('web:torrentsPerPage')).populate('category').sort('_id').exec((err, torrents) => {
                    if (err) {
                        console.log(err);
                    }
                    callback(null, torrents);
                });
            }
        ], (err, torrents) => {
            if (err) {
                console.log(err);
            }
            res.render('search', {
                torrents
            });
        });
    });

    router.get('/search', (req, res) => {
        const limit = req.query.limit || nconf.get('web:torrentsPerPage');
        const search = {};
        async.waterfall([
            function(callback) {
                if (req.query.category) {
                    Category.findOne({
                        slug: req.query.category
                    }).exec((err, category) => {
                        if (err) {
                            callback(err);
                        }
                        if (category) {
                            callback(null, category);
                        }
                    });
                } else {
                    callback(null, null);
                }
            },
            function(category, callback) {
                if (req.query.q) {
                    if (category === null) {
                        search.$text = {
                            $search: req.query.q
                        };
                    } else {
                        search.$text = {
                            $search: req.query.q
                        };
                        search.category = category._id;
                    }
                }
                Torrent.find(search, {
                    score: {
                        $meta: 'textScore'
                    }
                }).limit(limit).populate('category').exec((err, torrents) => {
                    if (err) {
                        console.log(err);
                    }
                    callback(null, torrents);
                });
            }
        ], (err, torrents) => {
            if (err) {
                console.log(err);
            }
            res.render('search', {
                torrents
            });
        });
    });

    router.get('/torrent/:infoHash', (req, res) => {
        Torrent.findOne({infoHash: req.params.infoHash}).populate('category').exec((err, torrent) => {
            if (err) {
                console.log(err);
            }
            res.render('torrent', {
                torrent
            });
        });
    });

    return router;
})();
