// This fixes the need for ../../../ with long paths especially when we use things in the models dir.
require('app-module-path').addPath(__dirname + '/app');

var express = require('express'),
    http = require('http'),
    nconf = require('nconf'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    mongoose = require('mongoose'),
    bunyan = require('bunyan'),
    path = require('path'),
    compression = require('compression');

nconf.use('memory');
nconf.argv().env().file({ file: './config.json' });

var log = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('./package.json').version,
    streams: [
        {
            level: 'info',
            stream: process.stdout // log INFO and above to stdout
        },
        {
            level: 'error',
            path: path.resolve('./logs/error.log') // log ERROR and above to a file
        }
    ]
});

mongoose.connect('mongodb://' + nconf.get('database:host') + ':' + nconf.get('database:port') + '/' + nconf.get('database:collection'), function(err){
    if(err){ console.log('Cannot connect to mongodb, please check your config.json'); process.exit(1); }
});

var app = express();

app.disable('x-powered-by');

app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');
app.use(compression());
app.use(express.static(__dirname + '/app/public', { maxAge: 86400000 }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({
    secret: nconf.get('session:secret'),
    name: 'session',
    store: new MongoStore({mongooseConnection: mongoose.connection}),
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

app.use('/', require('./app/routes/core'));

app.use(function(req, res){
    res.status(404).send('Either we lost this page or you clicked an incorrect link!');
    log.warn({
        status: '404',
        pageUrl: req.originalUrl
    });
});

http.createServer(app).listen(nconf.get('web:port'), '0.0.0.0');
