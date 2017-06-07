#!/usr/bin/env node
'use strict';
const meow = require('meow');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');
const astro = require('./lib');

const cli = meow(`
	Usage
	  $ astro [input]

	Options
	  --help            Show help menu
	  --background      Start background importing
	  --webserver       Start webserver and API
	  --log             Choose logging output [Default: bunyan]
	  --port            Port for webserver [Requires: --webserver]
	  --api-port        Changes API from /api to / with this port

	Examples
	  $ astro --webserver --web-port=5000
	  $ astro --background
`);

updateNotifier({pkg}).notify();

const {input, flags} = cli;

if (flags.webserver) {
    astro.boot(input[0], flags);
} else {
    cli.showHelp();
}
