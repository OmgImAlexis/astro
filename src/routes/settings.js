import {Router} from 'express';

import config from '../config';

const router = new Router();

const {providers} = config.get();

router.get('/', (req, res) => {
    res.json({
        settings: {
            providers
        }
    });
});

export default router;
