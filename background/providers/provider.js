/**
 * @file Provides a baseclass for archive providers
 */

'use strict';

import {MongoClient} from 'mongodb';

import config from '../../app/config';
import {generalLogger as log} from '../../app/log'; // eslint-disable-line import/default

const uri = `mongodb://${config.get('database.mongodb.host')}:${config.get('database.mongodb.port')}/${config.get('database.mongodb.collection')}`;
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

        this.setDuration();

        // Sets whether or not a provider should run at startup
        if (typeof (config.get(`providers.${provider}.startup`)) === 'boolean') {
            this.runAtStartup = config.get(`providers.${provider}.startup`);
        } else {
            // By default runAtStartup is true - The user has to be explicit if they
            // don't want a provider to run at startup.
            this.runAtStartup = true;
        }
        connect((err, conn) => {
            if (err) {
                log.warn('Cannot connect to mongodb, please check your config.json');
                throw new Error('Cannot connect to mongodb, please check your config.json');
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
    setDuration(duration = config.get(`providers.${this.provider}.config.duration`)) {
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
                    log.debug(`${this.duration} is an invalid duration.`);
                    log.warn(`Potentialy invalid duration for provider ${this.provider}.`);
                    log.warn(`Falling back to one hour.`);
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
    * Checks if a torrent should be added to the database based on the category
    * @param {string} category - A category name
    */
    static shouldAddTorrent(category) {
        const whiteList = config.get('torrents.whitelist');
        const blackList = config.get('torrents.blacklist');

        if (whiteList.enabled) {
            for (let i = 0; i < whiteList.categories; i++) {
                if (category.toUpperCase() === whiteList.categories[i]) {
                    return true;
                }
            }
        } else if (blackList.enabled) {
            for (let j = 0; j < blackList.categories; j++) {
                if (category.toUpperCase() === blackList.categories[j]) {
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
    static addTorrent({title, alias, size, details, swarm, lastmod, imported, infoHash}) {
        // Validate Data
        if (typeof (title) !== 'string' || typeof (infoHash) !== 'string') {
            // Bail out because we don't have a title or infoHash
            log.error('Skipping torrent due to a missing title or infoHash');
            return;
        }
        if (!alias) {
            alias = 'Unknown'; // Category isn't defined so set it to 'Unknown'
        }
        if (!Provider.shouldAddTorrent(alias)) {
            log.info('Skipping torrent due to being in ' + ((config.get('torrents.whitelist.enabled')) ? 'whitelist' : 'blacklist'));
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
                log.warn(`Error connecting to db.`);
                log.trace(err);
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
                // Duplicate insert === err.code 11000
                if (err && err.name !== 'MongoError' && err.code !== 11000) {
                    log.error(`Error inserting torrent: ${err.message}`);
                    log.trace(err);
                }
            });
        });
    }
}

export default Provider;
