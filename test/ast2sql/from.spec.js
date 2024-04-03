'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('from clause', () => {
    it('should support subselects in FROM clause', () => {
        assert.equal(
            getParsedSql('SELECT * FROM (SELECT id FROM t1) AS someAlias'),
            'SELECT * FROM (SELECT "id" FROM "t1") AS "someAlias"'
        );
    });

    it('should parse DUAL table', () => {
        const sql = `SELECT "id" FROM DUAL`;
        assert.equal(getParsedSql(sql), sql);
    });

    describe('table value expressions', () => {
        it('should support expressions with single values', () => {
            assert.equal(
                getParsedSql('SELECT id FROM (VALUES (1), (2)) t(id)'),
                'SELECT "id" FROM (VALUES (1), (2)) AS "t" ("id")'
            );
        });

        it('should support expressions with multiple values', () => {
            assert.equal(
                getParsedSql('SELECT id FROM (VALUES (1, 2), (3, 4)) t(id)'),
                'SELECT "id" FROM (VALUES (1,2), (3,4)) AS "t" ("id")'
            );
        });

        it('should support expressions with ROW keyword', () => {
            assert.equal(
                getParsedSql('SELECT id1, id2 FROM (VALUES ROW(1, 2), ROW(3, 4)) t(id1, id2)'),
                'SELECT "id1", "id2" FROM (VALUES ROW(1,2), ROW(3,4)) AS "t" ("id1", "id2")'
            );
        });
    });
});
