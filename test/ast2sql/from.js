'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('from clause', () => {
    it('should support subselects in FROM clause', () => {
        expect(getParsedSql('SELECT * FROM (SELECT id FROM t1) AS someAlias')).to.equal(
            'SELECT * FROM (SELECT "id" FROM "t1") AS "someAlias"'
        );
    });

    it('should parse DUAL table', () => {
        const sql = `SELECT "id" FROM DUAL`;
        expect(getParsedSql(sql)).to.equal(sql);
    });

    describe('table value expressions', () => {
        it('should support expressions with single values', () => {
            expect(getParsedSql('SELECT id FROM (VALUES (1), (2)) t(id)')).to.equal(
                'SELECT "id" FROM (VALUES (1), (2)) AS "t" ("id")'
            );
        });

        it('should support expressions with multiple values', () => {
            expect(getParsedSql('SELECT id FROM (VALUES (1, 2), (3, 4)) t(id)')).to.equal(
                'SELECT "id" FROM (VALUES (1,2), (3,4)) AS "t" ("id")'
            );
        });

        it('should support expressions with ROW keyword', () => {
            expect(getParsedSql('SELECT id1, id2 FROM (VALUES ROW(1, 2), ROW(3, 4)) t(id1, id2)')).to.equal(
                'SELECT "id1", "id2" FROM (VALUES ROW(1,2), ROW(3,4)) AS "t" ("id1", "id2")'
            );
        });
    });
});
