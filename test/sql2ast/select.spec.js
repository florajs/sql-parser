'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../index');

describe('select', () => {
    const parser = new Parser();

    it('should be null if empty', () => {
        const ast = parser.parse('SELECT a');

        assert.equal(ast.options, null);
        assert.equal(ast.distinct, null);
        assert.equal(ast.from, null);
        assert.equal(ast.where, null);
        assert.equal(ast.groupby, null);
        assert.equal(ast.orderby, null);
        assert.equal(ast.limit, null);
    });

    it('should have appropriate types', () => {
        const ast = parser.parse('SELECT SQL_NO_CACHE DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        assert.ok(Array.isArray(ast.options));
        assert.equal(ast.distinct, 'DISTINCT');
        assert.ok(Array.isArray(ast.from));
        assert.ok(typeof ast.where === 'object');
        assert.ok(Array.isArray(ast.groupby));
        assert.ok(Array.isArray(ast.orderby));
        assert.ok(Array.isArray(ast.limit));
    });
});
