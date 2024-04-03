'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('order by clause', () => {
    const parser = new Parser();
    let ast;

    it('should parse single column', () => {
        ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d');

        assert.deepEqual(ast.orderby, [{ expr: { type: 'column_ref', table: null, column: 'd' }, type: 'ASC' }]);
    });

    it('should parse multiple columns', () => {
        ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d, t.b dEsc, t.c');

        assert.deepEqual(ast.orderby, [
            { expr: { type: 'column_ref', table: null, column: 'd' }, type: 'ASC' },
            { expr: { type: 'column_ref', table: 't', column: 'b' }, type: 'DESC' },
            { expr: { type: 'column_ref', table: 't', column: 'c' }, type: 'ASC' }
        ]);
    });

    it('should parse expressions', () => {
        ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d, SuM(e)');

        assert.deepEqual(ast.orderby, [
            { expr: { type: 'column_ref', table: null, column: 'd' }, type: 'ASC' },
            {
                expr: {
                    type: 'aggr_func',
                    name: 'SUM',
                    quantifier: null,
                    args: { expr: { type: 'column_ref', table: null, column: 'e' } }
                },
                type: 'ASC'
            }
        ]);
    });
});
