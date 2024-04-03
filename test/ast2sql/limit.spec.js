'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('limit clause', () => {
    it('should work w/o offset', () => {
        assert.equal(getParsedSql('SELECT a FROM t limit 10'), 'SELECT "a" FROM "t" LIMIT 0,10');
    });

    it('should work w/ offset', () => {
        assert.equal(getParsedSql('SELECT a FROM t limit 10, 10'), 'SELECT "a" FROM "t" LIMIT 10,10');
    });
});
