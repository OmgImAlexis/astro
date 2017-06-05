import async from 'async';
import HTTPError from 'http-errors';
import {Router} from 'express';

import config from '../config';
import {version} from '../../package';
import {
    Category,
    Torrent
} from '../models';

const router = new Router();

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Astro API.',
        apiKeyRequired: config.get('api.keyNeeded'),
        version
    });
});

router.use((req, res, next) => {
    if (config.get('api.keyNeeded') === true) {
        if (req.query.apiKey === config.get('api.key')) {
            next();
        } else {
            return next(new HTTPError.Forbidden(`Invalid API key.`));
        }
    }
    return next();
});

router.get('/stats', (req, res) => {
    res.send('Welcome to the Astro api');
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
        res.json({
            categories
        });
    });
});

export default router;
