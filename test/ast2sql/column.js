'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('column clause', () => {
    it('should support asterisk', () => {
        expect(getParsedSql('SELECT * FROM t')).to.equal('SELECT * FROM "t"');
    });

    it('should support asterisk prefixed by table', () => {
        expect(getParsedSql('SELECT t.* FROM t')).to.equal('SELECT "t".* FROM "t"');
    });

    it('should parse multiple expressions', () => {
        const sql = 'SELECT col1 AS a, col2 AS b FROM t';
        expect(getParsedSql(sql)).to.equal('SELECT "col1" AS "a", "col2" AS "b" FROM "t"');
    });

    it('should escape reserved keywords', () => {
        expect(getParsedSql('SELECT col."select" FROM t')).to.equal('SELECT "col"."select" FROM "t"');
    });

    it('should escape reserved keywords in aliases', () => {
        expect(getParsedSql('SELECT col AS "index" FROM t')).to.equal('SELECT "col" AS "index" FROM "t"');
    });

    it('should escape aliases with non-identifier chars (/a-z0-9_/i)', () => {
        const sql = `SELECT col AS "foo bar" FROM t`;
        expect(getParsedSql(sql)).to.contain(`"col" AS "foo bar"`);
    });

    it('should support subselects', () => {
        expect(getParsedSql(`SELECT 'string', (SELECT col FROM t2) subSelect FROM t1`)).to.equal(
            `SELECT 'string', (SELECT "col" FROM "t2") AS "subSelect" FROM "t1"`
        );
    });
});
