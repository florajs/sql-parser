'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('from clause', () => {
    it('should support subselects in FROM clause', () => {
        expect(getParsedSql('SELECT * FROM (SELECT id FROM t1) AS someAlias'))
            .to.equal('SELECT * FROM (SELECT "id" FROM "t1") AS "someAlias"');
    });

    it('should parse DUAL table', () => {
        const sql = `SELECT "id" FROM DUAL`;
        expect(getParsedSql(sql)).to.equal(sql);
    });
});
