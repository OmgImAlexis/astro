/**
 * @file Provides a class for RSS Feeds
 * @TODO Finish me...
 */

'use strict';

import Provider from '../provider';

export const PROVIDER_NAME = 'rss';

class RSS extends Provider {
    constructor() {
        super(PROVIDER_NAME);
    }
}

export {RSS};
