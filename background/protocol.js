import http from 'http';
import https from 'https';

const userAgent = 'Astro (https://github.com/bitcannon-org/astro)';

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
