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

        expect(ast.from).to.eql([{
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
            lateral: false
        }]);
    });

    it('should parse DUAL table', () => {
        const ast = parser.parse('SELECT * FROM DUAL');
        expect(ast.from).to.eql([{ type: 'dual' }]);
    });
});
