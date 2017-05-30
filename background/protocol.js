/**
 * @file a simple module to return either the http or https module
 * depending on the url provided
 */

import http from 'http';
import https from 'https';

const userAgent = 'BitCannon (https://github.com/bitcannon-org/bitcannon-web)';

/**
 * @func protocol
 * @description Returns the http or https module depending on url
 * @param {string} url - The url to evaluate
 */
const protocol = url => {
    const err = new Error('Invalid URI');
    if (typeof (url) !== 'string') {
        throw err;
    }

    if (url.startsWith('https://')) {
        return https;
    } else if (url.startsWith('http://')) {
        return http;
    }

    throw err;
};

export {userAgent, protocol};
