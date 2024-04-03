'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser, util } = require('../../');
const { getParsedSql } = require('./util');

describe('group clause', () => {
    it('should support single expressions', () => {
        assert.equal(getParsedSql('SELECT a FROM t group by t.b'), 'SELECT "a" FROM "t" GROUP BY "t"."b"');
    });

    it('should support multiple expressions', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t GROUP BY t.b, t.c'),
            'SELECT "a" FROM "t" GROUP BY "t"."b", "t"."c"'
        );
    });

    it('should not generate an empty GROUP BY clause on empty arrays', () => {
        const ast = new Parser().parse('SELECT a FROM t');
        ast.groupby = [];
        assert.equal(util.astToSQL(ast), 'SELECT "a" FROM "t"');
    });
});
