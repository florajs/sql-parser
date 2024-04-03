'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('MySQL SQL extensions', () => {
    const parser = new Parser();

    it('should parse SQL_CALC_FOUND_ROWS', () => {
        const ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS col FROM t');
        assert.deepEqual(ast.options, ['SQL_CALC_FOUND_ROWS']);
    });

    it('should parse SQL_CACHE/SQL_NO_CACHE', () => {
        let ast = parser.parse('SELECT SQL_CACHE col FROM t');
        assert.deepEqual(ast.options, ['SQL_CACHE']);

        ast = parser.parse('SELECT SQL_NO_CACHE col FROM t');
        assert.deepEqual(ast.options, ['SQL_NO_CACHE']);
    });

    it('should parse SQL_SMALL_RESULT/SQL_BIG_RESULT', () => {
        let ast = parser.parse('SELECT SQL_SMALL_RESULT col FROM t');
        assert.deepEqual(ast.options, ['SQL_SMALL_RESULT']);

        ast = parser.parse('SELECT SQL_BIG_RESULT col FROM t');
        assert.deepEqual(ast.options, ['SQL_BIG_RESULT']);
    });

    it('should parse SQL_BUFFER_RESULT', () => {
        const ast = parser.parse('SELECT SQL_BUFFER_RESULT col FROM t');
        assert.deepEqual(ast.options, ['SQL_BUFFER_RESULT']);
    });

    it('should parse multiple options per query', () => {
        const ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS SQL_BIG_RESULT SQL_BUFFER_RESULT col FROM t');
        assert.deepEqual(ast.options, ['SQL_CALC_FOUND_ROWS', 'SQL_BIG_RESULT', 'SQL_BUFFER_RESULT']);
    });
});
