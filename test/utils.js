import test from 'ava';
import {slugify} from '../utils';

test('slugify " UnKNown ------ TeST " should return unknown', t => {
    t.is(slugify(' UnKNown ------ TeST '), 'unknown-test');
});
