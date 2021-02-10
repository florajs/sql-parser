'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('column clause', () => {
    const parser = new Parser();
    let ast;

    it('should parse "*" shorthand', () => {
        ast = parser.parse('SELECT * FROM t');
        expect(ast.columns).to.equal('*');
    });

    it('should parse "table.*" column expressions', () => {
        ast = parser.parse('SELECT t.* FROM t');

        expect(ast.columns).to.eql([{ expr: { type: 'column_ref', table: 't', column: '*' }, as: null }]);
    });

    it('should parse aliases w/o "AS" keyword', () => {
        ast = parser.parse('SELECT a aa FROM  t');

        expect(ast.columns).to.eql([{ expr: { type: 'column_ref', table: null, column: 'a' }, as: 'aa' }]);
    });

    it('should parse aliases w/ "AS" keyword', () => {
        ast = parser.parse('SELECT b.c as bc FROM t');

        expect(ast.columns).to.eql([{ expr: { type: 'column_ref', table: 'b', column: 'c' }, as: 'bc' }]);
    });

    it('should parse multiple columns', () => {
        ast = parser.parse('SELECT b.c as bc, 1+3 FROM t');

        expect(ast.columns).to.eql([
            { expr: { type: 'column_ref', table: 'b', column: 'c' }, as: 'bc' },
            {
                expr: {
                    type: 'binary_expr',
                    operator: '+',
                    left: { type: 'number', value: 1 },
                    right: { type: 'number', value: 3 }
                },
                as: null
            }
        ]);
    });

    describe('aggregate functions', () => {
        it('should parse COUNT(*)', () => {
            ast = parser.parse('SELECT COUNT(*) FROM t');

            expect(ast.columns).to.eql([
                {
                    expr: {
                        type: 'aggr_func',
                        name: 'COUNT',
                        args: {
                            expr: {
                                type: 'star',
                                value: '*'
                            }
                        }
                    },
                    as: null
                }
            ]);
        });

        ['avg', 'count', 'group_concat', 'max', 'min', 'sum'].forEach((aggrFunction) => {
            it(`should parse ${aggrFunction.toUpperCase()} function`, () => {
                ast = parser.parse(`SELECT ${aggrFunction}(col) FROM t`);

                expect(ast.columns).to.eql([
                    {
                        expr: {
                            type: 'aggr_func',
                            name: aggrFunction.toUpperCase(),
                            quantifier: null,
                            args: {
                                expr: {
                                    type: 'column_ref',
                                    table: null,
                                    column: 'col'
                                }
                            }
                        },
                        as: null
                    }
                ]);
            });
        });

        ['DISTINCT', 'ALL'].forEach((quantifier) => {
            it(`should parse ${quantifier} quantifier`, () => {
                ast = parser.parse(`SELECT GROUP_CONCAT(${quantifier} col) FROM t`);

                expect(ast.columns).to.eql([
                    {
                        expr: {
                            type: 'aggr_func',
                            name: 'GROUP_CONCAT',
                            quantifier,
                            args: {
                                expr: {
                                    type: 'column_ref',
                                    table: null,
                                    column: 'col'
                                }
                            }
                        },
                        as: null
                    }
                ]);
            });
        });
    });
});
