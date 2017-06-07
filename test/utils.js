import test from 'ava';
import {slugify} from '../src/utils';

test('slugify " UnKNown ------ TeST " should return "unknown-test"', t => {
    t.is(slugify(' UnKNown ------ TeST '), 'unknown-test');
});
