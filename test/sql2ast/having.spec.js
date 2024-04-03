'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('having clause', () => {
    const parser = new Parser();

    it('should parse single conditions', () => {
        const ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING COUNT(*) > 1');

        assert.deepEqual(ast.having, {
            type: 'binary_expr',
            operator: '>',
            left: {
                type: 'aggr_func',
                name: 'COUNT',
                args: { expr: { type: 'star', value: '*' } }
            },
            right: { type: 'number', value: 1 }
        });
    });

    it('should parse multiple conditions', () => {
        const ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING SUM(col2) > 10 OR 1 = 1');

        assert.deepEqual(ast.having, {
            type: 'binary_expr',
            operator: 'OR',
            left: {
                type: 'binary_expr',
                operator: '>',
                left: {
                    type: 'aggr_func',
                    name: 'SUM',
                    quantifier: null,
                    args: { expr: { type: 'column_ref', table: null, column: 'col2' } }
                },
                right: { type: 'number', value: 10 }
            },
            right: {
                type: 'binary_expr',
                operator: '=',
                left: { type: 'number', value: 1 },
                right: { type: 'number', value: 1 }
            }
        });
    });

    it('should parse subselects', () => {
        const ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING SUM(col2) > (SELECT 10)');

        assert.deepEqual(ast.having, {
            type: 'binary_expr',
            operator: '>',
            left: {
                type: 'aggr_func',
                name: 'SUM',
                quantifier: null,
                args: { expr: { type: 'column_ref', table: null, column: 'col2' } }
            },
            right: {
                with: null,
                type: 'select',
                options: null,
                distinct: null,
                columns: [{ expr: { type: 'number', value: 10 }, as: null }],
                from: null,
                where: null,
                groupby: null,
                having: null,
                orderby: null,
                limit: null,
                parentheses: true
            }
        });
    });
});
