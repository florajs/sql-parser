'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('having clause', () => {
    it('should support simple expressions', () => {
        expect(getParsedSql('SELECT a FROM t GROUP BY t.b having COUNT(*) > 1')).to.equal(
            'SELECT "a" FROM "t" GROUP BY "t"."b" HAVING COUNT(*) > 1'
        );
    });

    it('should support complex expressions', () => {
        expect(getParsedSql('SELECT a FROM t GROUP BY t.b HAVING COUNT(*) > (SELECT 10)')).to.equal(
            'SELECT "a" FROM "t" GROUP BY "t"."b" HAVING COUNT(*) > (SELECT 10)'
        );
    });
});
