/**
 * @file Imports torrents from various archive provider
 * @TODO Add providers to a queue when there are more providers than CPUs / cores.
 * They will then be executed in order after a worker process exits.
 * @TODO Handle workers that exit abnormally, log the fact that something went wrong
 * and perhaps queue the provider to be run again?
*/

import cluster from 'cluster';
import {cpus} from 'os';

import outdent from 'outdent';
import {MongoClient} from 'mongodb';

import config from '../app/config';
import Log from './logging';

const numCPUs = cpus().length;

const log = new Log('imports');

const providers = [];
const workers = [];

const loadProvider = provider => {
    log.info(`Loading provider ${provider}`);
    try {
        require(`${__dirname}/providers/${provider}`);
    } catch (err) {
        log.info(outdent`
             An error occurred loading the ${provider} provider.
             The error is as follows: ${err.message || ''}
         `);
        log.trace(err);
    }
};

/**
 * The idea here is to use the Node.js {@link https://nodejs.org/api/cluster.html|cluster} module
 * to take advantage of multi-core systems (i.e every modern computer). Node.js is single threaded
 * so the cluster module spawns multiple node.js processes. This should theoretically allow us to
 * process multiple archives at a time. However if this code is io bound rather than CPU bound it
 * might make no difference at all. Further testing is required.
 */
if (cluster.isMaster) {
    if (process.platform.startsWith('win')) {
        require('app-module-path').addPath(`${__dirname.substring(0, __dirname.lastIndexOf('\\'))}\\app`);
    } else {
        require('app-module-path').addPath(`${__dirname.substring(0, __dirname.lastIndexOf('/'))}/app`);
    }

    if (config.get('torrents.whitelist.enabled') && config.get('torrents.blacklist.enabled')) {
        log.error('You cannot use the whitelist and the blacklist at the same time!');
        throw new Error('You cannot use the whitelist and the blacklist at the same time!');
    }

    if (config.get('database.mongodb.enabled')) {
        const mongoHost = process.env.MONGO_HOST || config.get('database.mongodb.host');
        const uri = `mongodb://${mongoHost}:${config.get('database.mongodb.port')}/${config.get('database.mongodb.collection')}`;
        MongoClient.connect(uri, (err, db) => {
            if (err) {
                log.warn('Cannot connect to mongodb, please check your config.json');
                throw new Error('Cannot connect to mongodb, please check your config.json');
            }
            db.close();
        });
    } else {
        log.warn('No database is enabled, please check your config.json');
        throw new Error('No database is enabled, please check your config.json');
    }

    let newThread; // eslint-disable-line prefer-const

    const messageHandler = function(msg) {
        log.info(`Master ${process.pid} received message from worker ${this.process.pid}.`, msg);
        if ('provider' in msg) {
            if ('name' in msg.provider) {
                if ('next' in msg.provider) {
                    setTimeout(() => {
                        newThread(msg.provider.name);
                    }, (msg.provider.next + 1000));
                }
            }
        }
    };

    newThread = provider => {
        let availableCluster = false;
        let threadNum;
        if (workers.length < numCPUs) {
            availableCluster = true;
            workers.push(cluster.fork());
            threadNum = workers.length - 1;
        } else {
            for (threadNum = 0; threadNum < workers.length; threadNum++) {
                if (!workers[threadNum]) {
                    availableCluster = true;
                    workers[threadNum] = cluster.fork();
                    break;
                }
            }
        }
        if (availableCluster) {
            if (providers.length !== 0) {
                providers.push(String(provider));
                provider = providers.splice(0, 1);
            }
            if (provider) {
                 // Receive messages from this worker and handle them in the master process.
                workers[threadNum].on('message', messageHandler);
                workers[threadNum].send({provider: String(provider)});
            } else {
                workers[threadNum].kill();
                workers[threadNum] = undefined;
            }
        } else if (provider) {
            providers.push(String(provider));
        }
    };

    for (const provider in config.get('providers')) {
        if (provider === 'provider') {
            log.warn('You cannot directly use the provider file. This is a helper file for other providers.');
        }
         // For single core processors we don't fork, we just load all of the providers
         // and let Node do its thing.
        if (!config.get(`providers.${provider}.enabled`)) {
            continue;
        }
        if (numCPUs === 1) {
            loadProvider(String(provider));
        } else {
            newThread(String(provider));
        }
    }
    cluster.on('exit', (worker, code, signal) => {
        if (signal) {
            log.info(`worker was killed by signal: ${signal}`);
        } else if (code !== 0) {
            log.info(`worker exited with error code: ${code}`);
        } else if (worker.exitedAfterDisconnect !== true) {
            log.info('worker success!');
            workers[worker.id - 1] = undefined;
            newThread();
        }
    });
} else {
    log.info('Worker ' + process.pid + ' has started.');

    // Receive messages from the master process.
    process.on('message', msg => {
        if (msg.provider) {
            loadProvider(msg.provider);
        } else {
            log.info('Worker ' + process.pid + ' received message from master.', msg);
        }
    });
}
