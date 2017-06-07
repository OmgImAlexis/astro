import {Router} from 'express';

import {
    Torrent
} from '../models';

const router = new Router();

router.get('/:infoHash', async (req, res, next) => {
    const torrent = await Torrent.findOne({
        infoHash: req.params.infoHash
    }).populate('category').exec().catch(next);

    res.json({
        torrent
    });
});

export default router;
