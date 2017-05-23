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

nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/config.json')
});

var log = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('./package.json').version,
    streams: [
        {
            level: 'info',
            stream: process.stdout // log INFO and above to stdout
        }, {
            level: 'error',
            path: path.resolve(nconf.get('logs:location')) // log ERROR and above to a file
        }
    ]
});

if(nconf.get('database:mongodb:enabled')){
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err){
        if(err){ console.log('Cannot connect to mongodb, please check your config.json'); process.exit(1); }
    });
} else {
    console.log('No database is enabled, please check your config.json'); process.exit(1);
}

var app = express();

app.disable('x-powered-by');

app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');
app.use(compression());
app.use(express.static(__dirname + '/app/public', {
    maxAge: 86400000
}));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());

if(!nconf.get('session:secret') || nconf.get('session.secret') === '') {
  const crypto = require('crypto');
  crypto.randomBytes(48, function(err, buf) {
    if (err) {
      console.trace(err);
      throw err;
    }
    nconf.set('session:secret', buf.toString('hex'));
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

app.use(function(req, res, next){
    res.locals.title = nconf.get('web:title');
    res.locals.currentPath = req.originalUrl;
    res.locals.trackers = nconf.get('trackers');
    next();
});

app.use('/', require('./app/routes/core'));
app.use('/api', require('./app/routes/api'));

app.use(function(req, res){
    res.status(404).send('Either we lost this page or you clicked an incorrect link!');
    log.warn({
        status: '404',
        pageUrl: req.originalUrl
    });
});

http.createServer(app).listen(nconf.get('web:port'), '0.0.0.0', function(){
    console.log('Running on port '+ nconf.get('web:port'));
});
