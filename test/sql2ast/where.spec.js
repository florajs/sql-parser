'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('where clause', () => {
    const parser = new Parser();
    let ast;

    it('should parse single condition', () => {
        ast = parser.parse('SELECT * FROM t where t.a > 0');

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '>',
            left: { type: 'column_ref', table: 't', column: 'a' },
            right: { type: 'number', value: 0 }
        });
    });

    it('should parse parameters', () => {
        ast = parser.parse('SELECT * FROM t where t.a > :my_param');

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '>',
            left: { type: 'column_ref', table: 't', column: 'a' },
            right: { type: 'param', value: 'my_param' }
        });
    });

    it('should parse multiple conditions', () => {
        ast = parser.parse(`SELECT * FROM t where t.c between 1 and 't' AND Not true`);

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: 'AND',
            left: {
                type: 'binary_expr',
                operator: 'BETWEEN',
                left: { type: 'column_ref', table: 't', column: 'c' },
                right: {
                    type: 'expr_list',
                    value: [
                        { type: 'number', value: 1 },
                        { type: 'string', value: 't' }
                    ]
                }
            },
            right: {
                type: 'unary_expr',
                operator: 'NOT',
                expr: { type: 'bool', value: true }
            }
        });
    });

    it('should parse single condition with boolean', () => {
        ast = parser.parse('SELECT * FROM t where t.a = TRUE');

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: 't', column: 'a' },
            right: { type: 'bool', value: true }
        });
    });

    ['is', 'is not'].forEach((operator) => {
        it(`should parse ${operator} condition`, () => {
            ast = parser.parse(`SELECT * FROM t WHERE "col" ${operator} NULL`);

            assert.deepEqual(ast.where, {
                type: 'binary_expr',
                operator: operator.toUpperCase(),
                left: { type: 'column_ref', table: null, column: 'col' },
                right: { type: 'null', value: null }
            });
        });
    });

    ['exists', 'not exists'].forEach((operator) => {
        it('should parse ' + operator.toUpperCase() + ' condition', () => {
            ast = parser.parse(`SELECT * FROM t WHERE ${operator} (SELECT 1)`);

            assert.deepEqual(ast.where, {
                type: 'unary_expr',
                operator: operator.toUpperCase(),
                expr: {
                    with: null,
                    type: 'select',
                    options: null,
                    distinct: null,
                    columns: [{ expr: { type: 'number', value: 1 }, as: null }],
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
});
