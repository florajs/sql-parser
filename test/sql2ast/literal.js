'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('literals', () => {
    const parser = new Parser();

    describe('numbers', () => {
        [
            ['should parse positive number', '+1', 1],
            ['should parse negative number', '-1', -1],
            ['should parse positive numbers', '+10', 10],
            ['should parse negative numbers', '-10', -10]
        ].forEach(([label, expr, expectedValue]) => {
            it(label, () => {
                const ast = parser.parse(`SELECT ${expr}`);
                expect(ast.columns).to.eql([{ expr: { type: 'number', value: expectedValue }, as: null }]);
            });
        });
    });

    describe('strings', () => {
        it('should parse single quoted strings', () => {
            const ast = parser.parse(`SELECT 'string'`);
            expect(ast.columns).to.eql([{ expr: { type: 'string', value: 'string' }, as: null }]);
        });

        it('should parse keywords in single quotes as string', () => {
            const ast = parser.parse(`SELECT 'select'`);
            expect(ast.columns).to.eql([{ expr: { type: 'string', value: 'select' }, as: null }]);
        });

        it('should parse double single quotes as escape character', () => {
            const ast = parser.parse(`SELECT 'wendy''s'`);
            expect(ast.columns).to.eql([{ expr: { type: 'string', value: "wendy's" }, as: null }]);
        });
    });

    describe('datetime', () => {
        const literals = {
            time: '08:23:16',
            date: '1999-12-25',
            timestamp: '1999-12-25 08:23:16'
        };

        Object.keys(literals).forEach((type) => {
            const value = literals[type];

            [type, type.toUpperCase()].forEach((t) => {
                it(t, () => {
                    const ast = parser.parse(`SELECT ${t} '${value}'`);
                    expect(ast.columns).to.eql([{ expr: { type, value }, as: null }]);
                });
            });
        });
    });

    describe('interval', () => {
        describe('qualifiers', () => {
            ['MINUTE', 'HOUR', 'DAY', 'MONTH', 'YEAR'].forEach((qualifier) => {
                it(`should support ${qualifier}`, () => {
                    const ast = parser.parse(`SELECT CURRENT_DATE + INTERVAL 10 ${qualifier} FROM dual`);

                    expect(ast.columns).to.deep.contain({
                        expr: {
                            type: 'binary_expr',
                            operator: '+',
                            left: {
                                type: 'function',
                                name: 'CURRENT_DATE',
                                args: { type: 'expr_list', value: [] }
                            },
                            right: {
                                type: 'interval',
                                sign: null,
                                value: '10',
                                qualifier: qualifier
                            }
                        },
                        as: null
                    });
                });
            });
        });

        [
            ['should support intervals with explicit plus sign in interval qualifier', '+10', '+', '10'],
            ['should support negative interval qualifier', '-10', '-', '10']
        ].forEach(([description, interval, sign, expectedResult]) => {
            it(description, () => {
                const ast = parser.parse(`SELECT CURRENT_DATE + INTERVAL ${interval} DAY FROM dual`);

                expect(ast.columns).to.deep.contain({
                    expr: {
                        type: 'binary_expr',
                        operator: '+',
                        left: {
                            type: 'function',
                            name: 'CURRENT_DATE',
                            args: { type: 'expr_list', value: [] }
                        },
                        right: {
                            type: 'interval',
                            sign: sign,
                            value: expectedResult,
                            qualifier: 'DAY'
                        }
                    },
                    as: null
                });
            });
        });

        it('should support intervals as strings', () => {
            const ast = parser.parse(`SELECT CURRENT_DATE + INTERVAL '10' DAY FROM dual`);

            expect(ast.columns).to.deep.contain({
                expr: {
                    type: 'binary_expr',
                    operator: '+',
                    left: {
                        type: 'function',
                        name: 'CURRENT_DATE',
                        args: { type: 'expr_list', value: [] }
                    },
                    right: {
                        type: 'interval',
                        sign: null,
                        value: '10',
                        qualifier: 'DAY'
                    }
                },
                as: null
            });
        });

        [
            ['should support positive sign', '+', '-10'],
            ['should support negative sign', '-', '-10']
        ].forEach(([description, sign, expectedResult]) => {
            it(description, () => {
                const ast = parser.parse(`SELECT CURRENT_DATE + INTERVAL ${sign} '-10' DAY FROM dual`);

                expect(ast.columns).to.deep.contain({
                    expr: {
                        type: 'binary_expr',
                        operator: '+',
                        left: {
                            type: 'function',
                            name: 'CURRENT_DATE',
                            args: { type: 'expr_list', value: [] }
                        },
                        right: {
                            type: 'interval',
                            sign: sign,
                            value: expectedResult,
                            qualifier: 'DAY'
                        }
                    },
                    as: null
                });
            });
        });
    });
});
