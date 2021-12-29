'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('from clause', () => {
    const parser = new Parser();

    it('should parse single table', () => {
        const ast = parser.parse('SELECT * FROM t');
        expect(ast.from).to.eql([{ db: null, table: 't', as: null }]);
    });

    it('should parse tables from other databases', () => {
        const ast = parser.parse('SELECT * FROM u.t');
        expect(ast.from).to.eql([{ db: 'u', table: 't', as: null }]);
    });

    it('should parse tables from other databases (ANSI identifier)', () => {
        const ast = parser.parse('SELECT * FROM "u"."t"');
        expect(ast.from).to.eql([{ db: 'u', table: 't', as: null }]);
    });

    it('should parse subselect', () => {
        const ast = parser.parse('SELECT * FROM (SELECT id FROM t1) someAlias');

        expect(ast.from).to.eql([
            {
                expr: {
                    with: null,
                    type: 'select',
                    options: null,
                    distinct: null,
                    from: [{ db: null, table: 't1', as: null }],
                    columns: [{ expr: { type: 'column_ref', table: null, column: 'id' }, as: null }],
                    where: null,
                    groupby: null,
                    having: null,
                    orderby: null,
                    limit: null,
                    parentheses: true
                },
                as: 'someAlias',
                lateral: false,
                columns: null
            }
        ]);
    });

    it('should parse DUAL table', () => {
        const ast = parser.parse('SELECT * FROM DUAL');
        expect(ast.from).to.eql([{ type: 'dual' }]);
    });

    describe('values', () => {
        it('should parse table constructors with single value row value constructors', () => {
            const ast = parser.parse('SELECT id FROM (VALUES (1), (2)) t (id)');

            expect(ast.from).to.eql([
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [{ type: 'number', value: 1 }]
                            },
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [{ type: 'number', value: 2 }]
                            }
                        ]
                    },
                    as: 't',
                    columns: ['id']
                }
            ]);
        });

        it('should parse table constructors with multi value row value constructors', () => {
            const ast = parser.parse('SELECT id1, id2 FROM (VALUES (1, 2), (3, 4)) t (id1, id2)');

            expect(ast.from).to.eql([
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [
                                    { type: 'number', value: 1 },
                                    { type: 'number', value: 2 }
                                ]
                            },
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [
                                    { type: 'number', value: 3 },
                                    { type: 'number', value: 4 }
                                ]
                            }
                        ]
                    },
                    as: 't',
                    columns: ['id1', 'id2']
                }
            ]);
        });

        it('should parse table constructors with ROW keyword row value constructors', () => {
            const ast = parser.parse('SELECT * FROM (VALUES ROW(1, 2), ROW(3, 4)) t');

            expect(ast.from).to.eql([
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: true,
                                value: [
                                    { type: 'number', value: 1 },
                                    { type: 'number', value: 2 }
                                ]
                            },
                            {
                                type: 'row_value',
                                keyword: true,
                                value: [
                                    { type: 'number', value: 3 },
                                    { type: 'number', value: 4 }
                                ]
                            }
                        ]
                    },
                    as: 't',
                    columns: null
                }
            ]);
        });
    });
});
