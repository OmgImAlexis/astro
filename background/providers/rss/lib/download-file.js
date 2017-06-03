import zlib from 'zlib';
import {parse as parseURL} from 'url';

import {protocol, userAgent} from '../../../protocol';

const requestOptions = url => {
    const request = {
        headers: {
            'User-Agent': userAgent,
            'Accept-Encoding': 'gzip'
        }
    };

    const uri = parseURL(url);

    request.port = ((uri.port) ? uri.port : ((uri.protocol === 'https:') ? 443 : 80));

    if (uri.auth) {
        request.auth = uri.auth;
    }

    request.hostname = uri.hostname;
    request.path = uri.path;

    return request;
};

const gunzipFile = file => {
    return new Promise((resolve, reject) => {
        const gunzip = zlib.createGunzip();
        let _data = '';

        file.pipe(gunzip);
        gunzip.on('data', data => {
            _data += data.toString();
        }).on('error', err => {
            return reject(err);
        }).on('end', () => {
            return resolve(_data);
        });
    });
};

const downloadFile = url => {
    return new Promise((resolve, reject) => {
        protocol(url).get(requestOptions(url), res => {
            if (res.headers['content-type'] === 'application/x-gzip' || res.headers['content-encoding'] === 'gzip') {
                gunzipFile(res).then(data => {
                    return resolve(data);
                }).catch(err => {
                    return reject(err);
                });
            } else {
                let _file = '';
                res.on('data', chunk => {
                    res.setEncoding('utf8');
                    _file += chunk;
                });
                res.on('end', (() => {
                    return resolve(_file);
                });
            }
        });
    });
};

export default downloadFile;
