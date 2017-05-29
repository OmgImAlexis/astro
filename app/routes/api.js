import nconf from 'nconf';
import async from 'async';
import {Router} from 'express';

import {
    Category,
    Torrent
} from '../models';

const router = new Router();

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the bitcannon API',
        apiKeyRequired: nconf.get('api:keyNeeded'),
        status: 200
    });
});

router.use((req, res, next) => {
    if (nconf.get('api:keyNeeded') === true) {
        if (req.query.apiKey === nconf.get('api:key')) {
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

router.get('/stats', (req, res) => {
    res.send('Welcome to the _ api');
});

router.get('/browse', (req, res, next) => {
    Category.find({}).sort({
        title: 1
    }).exec((err, categories) => {
        if (err) {
            next(err);
        }
        async.each(categories, (category, callback) => {
            // This is to check if the calculation is already done for the category
            // If a new one is added and the calculation isn't done then it does it and saves it for later
            if (category.torrentCount < 0 || !category.torrentCount) {
                Torrent.count({
                    category: category._id
                }).exec((err, torrentCount) => {
                    if (err) {
                        next(err);
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
            res.json({
                categories
            });
        });
    });
});

router.get('/category/:slug', (req, res, next) => {
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
                    next(err);
                }
                callback(null, torrents);
            });
        }
    ], (err, torrents) => {
        if (err) {
            next(err);
        }
        res.json({
            torrents
        });
    });
});

router.get('/torrent/:infoHash', (req, res, next) => {
    Torrent.findOne({
        infoHash: req.params.infoHash
    }).populate('category').exec((err, torrent) => {
        if (err) {
            next(err);
        }
        res.json('torrent', {
            torrent
        });
    });
});

router.get('/search', (req, res, next) => {
    const limit = req.query.limit || nconf.get('web:torrentsPerPage');
    const sorting = (req.query.sort || nconf.get('web:defaultSearchSorting')).toLowerCase();
    const order = (req.query.order || nconf.get('web:defaultSearchOrder')).toLowerCase();
    const sort = {
        score: {
            $meta: 'textScore'
        }
    };
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
        }, (category, callback) => {
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
            sort[((sorting === 'seeders' || sorting === 'leechers') ? 'swarm.' : '') + sorting] = (order === 'asc' ? 1 : -1);
            Torrent.find(search, {
                score: {
                    $meta: 'textScore'
                }
            }).limit(limit).sort(sort).populate('category').exec((err, torrents) => {
                if (err) {
                    next(err);
                }
                callback(null, torrents);
            });
        }
    ], (err, torrents) => {
        if (err) {
            next(err);
        }
        res.json({
            torrents
        });
    });
});

export default router;
