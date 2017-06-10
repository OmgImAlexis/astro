import {Router} from 'express';
import HTTPError from 'http-errors';

import {
    Torrent
} from '../models';

const router = new Router();

router.get('/:infoHash', async (req, res, next) => {
    const {infoHash} = req.params;
    const torrent = await Torrent.findOne({
        infoHash
    }).populate('category').exec().catch(next);

    if (torrent) {
        res.send({
            torrent
        });
    } else {
        next(new HTTPError.NotFound('No torrent found'));
    }
});

router.post('/', (req, res, next) => {
    const {title, infoHash, category} = req.body;
    Torrent.create({
        title,
        infoHash,
        category
    }).then(torrent => {
        res.send({torrent});
    }).catch(next);
});

export default router;
