import nconf from 'nconf';
import async from 'async';
import {Router} from 'express';

import {
    Category,
    Torrent
} from '../models';

const router = new Router();

router.use((req, res, next) => {
    Torrent.count().exec((err, count) => {
        if (err) {
            next(err);
        }
        res.locals.stats = {};
        res.locals.stats.count = count;
        next();
    });
});

router.get('/', (req, res, next) => {
    Category.find().exec((err, categories) => {
        if (err) {
            next(err);
        }
        res.render('index', {
            categories
        });
    });
});

router.get('/about', (req, res) => {
    res.render('about');
});

router.get('/browse', (req, res, next) => {
    Category.find({}).sort({
        title: 1
    }).exec((err, categories) => {
        if (err) {
            next(err);
        }
        async.each(categories, (category, callback) => {
            if (category.torrentCount < 0) {
                Torrent.count({
                    category: category._id
                }).exec((err, torrentCount) => {
                    if (err) {
                        callback(err);
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
                next(err);
            }
            res.render('browse', {
                categories
            });
        });
    });
});

router.get('/category/:slug', (req, res, next) => {
    async.waterfall([
        callback => {
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
        }, (category, callback) => {
            Torrent.find({
                category: category._id
            }).limit(nconf.get('web:torrentsPerPage')).populate('category').sort('_id').exec((err, torrents) => {
                if (err) {
                    callback(err);
                }
                callback(null, torrents);
            });
        }
    ], (err, torrents) => {
        if (err) {
            next(err);
        }
        res.render('search', {
            torrents
        });
    });
});

router.get('/search', (req, res, next) => {
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
                    callback(err);
                }
                callback(null, torrents);
            });
        }
    ], (err, torrents) => {
        if (err) {
            next(err);
        }
        res.render('search', {
            torrents
        });
    });
});

router.get('/torrent/:infoHash', (req, res, next) => {
    Torrent.findOne({infoHash: req.params.infoHash}).populate('category').exec((err, torrent) => {
        if (err) {
            next(err);
        }
        res.render('torrent', {
            torrent
        });
    });
});

export default router;
