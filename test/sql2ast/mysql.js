'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('MySQL SQL extensions', () => {
    const parser = new Parser();

    it('should parse SQL_CALC_FOUND_ROWS', () => {
        const ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS col FROM t');
        expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS']);
    });

    it('should parse SQL_CACHE/SQL_NO_CACHE', () => {
        let ast = parser.parse('SELECT SQL_CACHE col FROM t');
        expect(ast.options).to.eql(['SQL_CACHE']);

        ast = parser.parse('SELECT SQL_NO_CACHE col FROM t');
        expect(ast.options).to.eql(['SQL_NO_CACHE']);
    });

    it('should parse SQL_SMALL_RESULT/SQL_BIG_RESULT', () => {
        let ast = parser.parse('SELECT SQL_SMALL_RESULT col FROM t');
        expect(ast.options).to.eql(['SQL_SMALL_RESULT']);

        ast = parser.parse('SELECT SQL_BIG_RESULT col FROM t');
        expect(ast.options).to.eql(['SQL_BIG_RESULT']);
    });

    it('should parse SQL_BUFFER_RESULT', () => {
        const ast = parser.parse('SELECT SQL_BUFFER_RESULT col FROM t');
        expect(ast.options).to.contain('SQL_BUFFER_RESULT');
    });

    it('should parse multiple options per query', () => {
        const ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS SQL_BIG_RESULT SQL_BUFFER_RESULT col FROM t');
        expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS', 'SQL_BIG_RESULT', 'SQL_BUFFER_RESULT']);
    });
});
