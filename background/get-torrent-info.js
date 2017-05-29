/**
 * @file A module to parse torrent info from a magnet link or torrent file
 * @TODO Node v8.0 will have a util.promisify method. Replace promisifyAll with this
 */

import outdent from 'outdent';

const {promisifyAll} = require('bluebird');
const parseTorrent = promisifyAll(require('parse-torrent'));

/**
 * @func getTorrentInfo
 * @description Parses torrent metadata
 */
module.exports = function(log = console) {
    return function(url = '', struct = {
        _id: String(),
        size: Number(),
        swarm: {seeders: 0, leechers: 0}
    }, cb = () => {}) {
        if (url.indexOf('http') !== 0 && url.indexOf('magnet:') !== 0) {
            return cb(new Error('Invalid URL'), struct);
        }

        parseTorrent.remoteAsync(url).then(parsedTorrent => {
            if (typeof (struct.size) !== 'number' || struct.size < 0 || isNaN(struct.size)) {
                struct.size = parsedTorrent.length;
            }

            struct._id = parsedTorrent.infoHash.toUpperCase();

            struct.swarm.leechers = (struct.swarm.leechers === -1) ? 0 : struct.swarm.leechers;
            struct.swarm.seeders = (struct.swarm.seeders === -1) ? 0 : struct.swarm.seeders;

            return cb(undefined, struct);
        }).catch((err, parsedTorrent) => {
            log.info(err);
            log.info(outdent`
                An error has occurred processing the following torrent: ${url}
                This could mean either the file is damaged or there is a problem with your network connection.
                Is your Internet connection working?
                Does your ISP block or censor?
                Do you have any security software such as a firewall or anti-virus?
            `);
            return cb(err, parsedTorrent);
        });
    };
};
