import {Router} from 'express';

import config from '../config';
import {
    Category,
    Torrent
} from '../models';

const router = new Router();

router.get('/:slug', async (req, res, next) => {
    const category = await Category.findOne({
        slug: req.params.slug
    }).exec().catch(next);

    const torrents = await Torrent.find({
        category: category._id
    }).limit(config.get('app.torrentsPerPage')).populate('category').sort('_id').exec().catch(next);

    res.json({
        torrents
    });
});

export default router;
