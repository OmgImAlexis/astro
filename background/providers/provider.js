/**
 * @file Provides a baseclass for archive providers
 */

'use strict';

import nconf from 'nconf';
import outdent from 'outdent';
import {MongoClient} from 'mongodb';

import Log from '../logging';

const log = new Log('provider');
const uri = `mongodb://${nconf.get('database:mongodb:host')}:${nconf.get('database:mongodb:port')}/${nconf.get('database:mongodb:collection')}`;
let db;

/**
 * Will reuse connection if already created
 * @todo Move this to a seperate module along
 * with any other database code.
 */
const connect = callback => {
    if (db === undefined) {
        MongoClient.connect(uri, {
            poolSize: 10000000,
            raw: true
        }, (err, conn) => {
            if (err) {
                return callback(err);
            }
            db = conn;
            callback(null, conn);
        });
    } else {
        callback(null, db);
    }
};

/**
 * Class representing an archive provider
 * @todo Move database code into a separate module. This will pave the way for using other databases.
 */
class Provider {
    /**
     * Constructs a Provider
     * @param {string} provider - The name of an archive provider
     */
    constructor(provider) {
        this.provider = provider;
        this.log = new Log(`imports:${provider}`);

        this.setDuration();

        // Sets whether or not a provider should run at startup
        if (typeof (nconf.get(`providers:${provider}:startup`)) === 'boolean') {
            this.runAtStartup = nconf.get(`providers:${provider}:startup`);
        } else {
            // By default runAtStartup is true - The user has to be explicit if they
            // don't want a provider to run at startup.
            this.runAtStartup = true;
        }
        connect((err, conn) => {
            if (err) {
                this.log.warn('Cannot connect to mongodb, please check your config.json');
                throw new Error();
            }
            db = conn;
            log.info('Connected correctly to server');
        });
    }

    getProvider() {
        return this.provider;
    }

   /**
    * This method is invoked upon startup of the provider
    * and is where the bulk of the processing of a provider
    * occurs.
    * @virtual
    */
    run() {}

    /**
     * This method decides whether or not to run the provider
     * on startup and schedules how often to run
     * @todo Move this code into imports.js
     */
    startup() {
        this.interval = undefined;

        if (this.runAtStartup) {
            this.run();
        }
        this.interval = setInterval(this.run, this.duration);
    }

   /**
    * Sets the duration a provider should run
    * @todo remove magic numbers (make them constants)
    * @param duration {string|number} - The duration to set
    */
    setDuration(duration = nconf.get(`providers:${this.provider}:config:duration`)) {
        switch (duration) {
            case '@hourly':
                this.duration = 3600000;
                break;
            case '@daily':
                this.duration = 86400000;
                break;
            default:
                this.duration = Number(duration);
                if (isNaN(this.duration)) {
                    this.log.warn(outdent`
                        Potentialy invalid duration for provider ${this.provider}.
                        Falling back to one hour.
                    `);
                    this.duration = 3600000;
                }
        }
    }

   /**
    * Closes any open connections to the db
    * @param {function} callback - Callback to execute after closing any connections to the db
    */
    closeDB(callback) {
        connect((err, db) => {
            db.close(false, dbCloseErr => {
                if (!err) {
                    err = dbCloseErr;
                }
                if (typeof (callback) === 'function') {
                    return callback(err);
                }
            });
        });
    }

   /**
    * Checks if a torrent should be added to the database
    * @param {string} category - A torrents category
    */
    static shouldAddTorrent(category) {
        if (nconf.get('torrents:whitelist:enabled')) {
            for (let i = 0; i < nconf.get('torrents:whitelist:categories'); i++) {
                if (category.toUpperCase() === nconf.get('torrents:whitelist:categories')[i]) {
                    return true;
                }
            }
        } else if (nconf.get('torrents:blacklist:enabled')) {
            for (let j = 0; j < nconf.get('torrents:blacklist:enabled'); j++) {
                if (category.toUpperCase() === nconf.get('torrents:blacklist:categories')[j]) {
                    return false;
                }
            }
        }

        return true;
    }

    /** Add a torrent to the database
    * @todo If we have a .torrent file and don't have a magnet link / infohash we should store the .torrent file
    * either in a directory or in the database. ({@link https://github.com/bitcannon-org/bitcannon-web/issues/19|#19})
    */
    static addTorrent({title, aliases, size, details, swarm, lastmod, imported, infoHash}) {
        // Validate Data
        if (typeof (title) !== 'string' || typeof (infoHash) !== 'string') {
            // Bail out because we don't have a title or infoHash
            this.log.error('Skipping torrent due to a missing title or infoHash');
            return;
        }
        if (!aliases) {
            aliases = 'Other'; // Category isn't defined so set it to 'Other'
        }
        if (!Provider.shouldAddTorrent(aliases)) {
            this.log.info('Skipping torrent due to being in ' +
                ((nconf.get('torrents:whitelist:enabled')) ? 'whitelist' : 'blacklist')
            );
            return;
        }
        if (!lastmod) {
            lastmod = Date.now();
        }
        if (!imported) {
            imported = Date.now();
        }
        if (!details) {
            details = [];
        }
        if (!swarm || typeof (swarm) !== 'object') {
            swarm = {seeders: 0, leecher: 0};
        } else {
            // Get rid of anything that shouldn't be in the swarm object
            for (const key in swarm) {
                if (key !== 'seeders' && key !== 'leechers') {
                    delete swarm[key];
                }
            }
            if (typeof (swarm.seeders) !== 'number') {
                swarm.seeders = 0;
            }
            if (typeof (swarm.leechers) !== 'number') {
                swarm.leechers = 0;
            }
        }

        connect((err, db) => {
            if (err) {
                this.log.warn(err);
                throw new Error();
            }
            db.collection('torrents').insertOne({
                title,
                size,
                details: [
                    details
                ],
                swarm: {
                    seeders: swarm.seeders || 0,
                    leechers: swarm.leecher || 0
                },
                lastmod,
                imported,
                infoHash
            }, err => {
                if (err) {
                    this.log.error(`Error inserting torrent: ${err.message}`);
                    this.log.trace(err);
                }
            });
        });
    }
}

export default Provider;
