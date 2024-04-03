'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('having clause', () => {
    it('should support simple expressions', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t GROUP BY t.b having COUNT(*) > 1'),
            'SELECT "a" FROM "t" GROUP BY "t"."b" HAVING COUNT(*) > 1'
        );
    });

    it('should support complex expressions', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t GROUP BY t.b HAVING COUNT(*) > (SELECT 10)'),
            'SELECT "a" FROM "t" GROUP BY "t"."b" HAVING COUNT(*) > (SELECT 10)'
        );
    });
});
