'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('column clause', () => {
    it('should support asterisk', () => {
        assert.equal(getParsedSql('SELECT * FROM t'), 'SELECT * FROM "t"');
    });

    it('should support asterisk prefixed by table', () => {
        assert.equal(getParsedSql('SELECT t.* FROM t'), 'SELECT "t".* FROM "t"');
    });

    it('should parse multiple expressions', () => {
        const sql = 'SELECT col1 AS a, col2 AS b FROM t';
        assert.equal(getParsedSql(sql), 'SELECT "col1" AS "a", "col2" AS "b" FROM "t"');
    });

    it('should escape reserved keywords', () => {
        assert.equal(getParsedSql('SELECT col."select" FROM t'), 'SELECT "col"."select" FROM "t"');
    });

    it('should escape reserved keywords in aliases', () => {
        assert.equal(getParsedSql('SELECT col AS "index" FROM t'), 'SELECT "col" AS "index" FROM "t"');
    });

    it('should escape aliases with non-identifier chars (/a-z0-9_/i)', () => {
        assert.equal(getParsedSql(`SELECT col AS "foo bar" FROM t`), `SELECT "col" AS "foo bar" FROM "t"`);
    });

    it('should support subselects', () => {
        assert.equal(
            getParsedSql(`SELECT 'string', (SELECT col FROM t2) subSelect FROM t1`),
            `SELECT 'string', (SELECT "col" FROM "t2") AS "subSelect" FROM "t1"`
        );
    });
});
