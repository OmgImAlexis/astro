import HTTPError from 'http-errors';
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

    if (!category) {
        return next(new HTTPError.NotFound('Invalid category.'));
    }

    const torrents = await Torrent.find({
        category: category._id
    }).limit(config.get('app.torrentsPerPage')).populate('category').sort('_id').exec().catch(next);

    return res.send({
        torrents
    });
});

router.post('/', async (req, res, next) => {
    const {title} = req.body;
    await Category.create({
        title
    }).then(category => {
        return res.send({category});
    }).catch(next);
});

export default router;
