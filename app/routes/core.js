import async from 'async';
import {Router} from 'express';

import config from '../config';
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

router.get('/', async (req, res, next) => {
    const categories = await Category.find().exec().catch(next);
    res.render('index', {
        categories
    });
});

router.get('/about', (req, res) => {
    res.render('about');
});

router.get('/browse', async (req, res, next) => {
    const categories = await Category.find({}).sort({
        title: 1
    }).exec().catch(next);

    async.each(categories, async (category, callback) => {
        // This is to check if the calculation is already done for the category
        // If a new one is added and the calculation isn't done then it does it and saves it for later
        if (category.torrentCount < 0 || !category.torrentCount) {
            const count = await Torrent.count({
                category: category._id
            }).exec().catch(callback);
            category.torrentCount = count;
            category.save();
            callback(null);
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

router.get('/category/:slug', async (req, res, next) => {
    const category = await Category.findOne({
        slug: req.params.slug
    }).exec().catch(next);

    const torrents = await Torrent.find({
        category: category._id
    }).limit(config.get('app.torrentsPerPage')).populate('category').sort('_id').exec().catch(next);

    res.render('search', {
        torrents
    });
});

router.get('/torrent/:infoHash', async (req, res, next) => {
    const torrent = await Torrent.findOne({
        infoHash: req.params.infoHash
    }).populate('category').exec().catch(next);

    res.render('torrent', {
        torrent
    });
});

router.get('/search', async (req, res, next) => {
    const limit = req.query.limit || config.get('app.torrentsPerPage');
    const sorting = (req.query.sort || config.get('app.defaultSearchSorting')).toLowerCase();
    const order = (req.query.order || config.get('app.defaultSearchOrder')).toLowerCase();
    const sort = {
        score: {
            $meta: 'textScore'
        }
    };
    const search = {};
    let category = null;
    if (req.query.category) {
        category = await Category.findOne({
            slug: req.query.category
        }).exec().catch(next);
    }
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
    const torrents = await Torrent.find(search, {
        score: {
            $meta: 'textScore'
        }
    }).limit(limit).sort(sort).populate('category').exec().catch(next);

    res.render('search', {
        torrents
    });
});

export default router;
