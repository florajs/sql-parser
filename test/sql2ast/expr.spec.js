'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('expressions', () => {
    const parser = new Parser();

    describe('function', () => {
        it('should parse functions', () => {
            const ast = parser.parse('SELECT fun(d) FROM t');

            assert.deepEqual(ast.columns, [
                {
                    expr: {
                        type: 'function',
                        name: 'fun',
                        args: {
                            type: 'expr_list',
                            value: [{ type: 'column_ref', table: null, column: 'd' }]
                        }
                    },
                    as: null
                }
            ]);
        });

        ['year', 'month', 'day', 'hour', 'minute'].forEach((fn) => {
            it(`should parse ${fn} date function expression`, () => {
                const ast = parser.parse(`SELECT ${fn}(NOW()) FROM dual`);

                assert.deepEqual(ast.columns, [
                    {
                        expr: {
                            type: 'function',
                            name: fn.toUpperCase(),
                            args: {
                                type: 'expr_list',
                                value: [
                                    {
                                        type: 'function',
                                        name: 'NOW',
                                        args: { type: 'expr_list', value: [] }
                                    }
                                ]
                            }
                        },
                        as: null
                    }
                ]);
            });
        });

        [
            'CURRENT_DATE',
            'CURRENT_TIME',
            'CURRENT_TIMESTAMP',
            'CURRENT_USER',
            'SESSION_USER',
            'USER',
            'SYSTEM_USER'
        ].forEach((func) => {
            it(`should parse scalar function ${func}`, () => {
                const ast = parser.parse(`SELECT ${func} FROM t`);

                assert.deepEqual(ast.columns, [
                    {
                        expr: {
                            type: 'function',
                            name: func,
                            args: {
                                type: 'expr_list',
                                value: []
                            }
                        },
                        as: null
                    }
                ]);
            });
        });
    });
});
