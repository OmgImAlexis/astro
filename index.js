import path from 'path';
import http from 'http';
import express from 'express';
import nconf from 'nconf';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import session from 'express-session';
import mongoose from 'mongoose';
import compression from 'compression';

import log from './app/log';
import {
    api,
    core
} from './app/routes';

const MongoStore = require('connect-mongo')(session);

mongoose.Promise = Promise;

nconf.argv().file({
    file: path.resolve(__dirname, 'config.json')
});

if (nconf.get('database:mongodb:enabled')) {
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), err => {
        if (err) {
            log.error('Cannot connect to mongodb, please check your config.json');
            process.exit(1);
        }
    });
} else {
    log.error('No database is enabled, please check your config.json');
    process.exit(1);
}

const app = express();

app.disable('x-powered-by');

app.set('views', path.resolve(__dirname, 'app/views'));
app.set('view engine', 'jade');
app.use(compression());
app.use(express.static(path.resolve(__dirname, 'app/public'), {
    maxAge: 86400000
}));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());

if (!nconf.get('session:secret') || nconf.get('session.secret') === '') {
    const crypto = require('crypto');
    crypto.randomBytes(48, (err, buf) => {
        if (err) {
            log.trace(err);
            throw err;
        }
        const secret = buf.toString('hex');
        nconf.set('session:secret', secret);
        nconf.save();
    });
}

app.use(session({
    secret: nconf.get('session:secret'),
    name: 'session',
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    }),
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.title = nconf.get('web:title');
    res.locals.currentPath = req.originalUrl;
    res.locals.trackers = nconf.get('trackers');
    next();
});

app.use('/', core);
app.use('/api', api);

app.use((req, res) => {
    res.status(404).send('Either we lost this page or you clicked an incorrect link!');
    log.warn({
        status: '404',
        pageUrl: req.originalUrl
    });
});

http.createServer(app).listen(nconf.get('web:port'), '0.0.0.0', () => {
    log.info('Running on port ' + nconf.get('web:port'));
});
