'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('limit clause', () => {
    it('should work w/o offset', () => {
        const sql = 'SELECT a FROM t limit 10';
        expect(getParsedSql(sql)).to.equal('SELECT "a" FROM "t" LIMIT 0,10');
    });

    it('should work w/ offset', () => {
        const sql = 'SELECT a FROM t limit 10, 10';
        expect(getParsedSql(sql)).to.equal('SELECT "a" FROM "t" LIMIT 10,10');
    });
});
