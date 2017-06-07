import {Router} from 'express';

import config from '../config';
import {
    Category,
    Torrent
} from '../models';

const router = new Router();

router.get('/', async (req, res, next) => {
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

    res.json({
        torrents
    });
});

export default router;
