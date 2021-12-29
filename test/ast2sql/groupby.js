'use strict';

const { expect } = require('chai');
const { Parser, util } = require('../../');
const { getParsedSql } = require('./util');

describe('group clause', () => {
    it('should support single expressions', () => {
        expect(getParsedSql('SELECT a FROM t group by t.b')).to.equal('SELECT "a" FROM "t" GROUP BY "t"."b"');
    });

    it('should support multiple expressions', () => {
        expect(getParsedSql('SELECT a FROM t GROUP BY t.b, t.c')).to.equal(
            'SELECT "a" FROM "t" GROUP BY "t"."b", "t"."c"'
        );
    });

    it('should not generate an empty GROUP BY clause on empty arrays', () => {
        const ast = new Parser().parse('SELECT a FROM t');
        ast.groupby = [];
        expect(util.astToSQL(ast)).to.equal('SELECT "a" FROM "t"');
    });
});
