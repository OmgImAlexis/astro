import http from 'http';
import https from 'https';

import test from 'ava';

import {protocol, userAgent} from '../protocol';

test('https://example.com should return the https module', t => {
    const _https = protocol('https://example.com');
    t.is(_https, https);
});

test('http://example.com should return the http module', t => {
    const _http = protocol('http://example.com');
    t.is(_http, http);
});

test('ftp://example.com should throw', t => {
    t.throws(() => {
        protocol('ftp://example.com');
    });
});

test(`userAgent should be 'Astro (https://github.com/bitcannon-org/astro)'`, t => {
    t.is(userAgent, 'Astro (https://github.com/bitcannon-org/astro)');
});
