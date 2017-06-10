import {Router} from 'express';

import config from '../config';

const router = new Router();

const {providers} = config.get();

router.get('/', (req, res) => {
    res.send({
        settings: {
            providers
        }
    });
});

export default router;
