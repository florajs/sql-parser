'use strict';

const { expect } = require('chai');
const { Parser } = require('../../index');

describe('select', () => {
    const parser = new Parser();

    it('should be null if empty', () => {
        const ast = parser.parse('SELECT a');

        expect(ast.options).to.be.null;
        expect(ast.distinct).to.be.null;
        expect(ast.from).to.be.null;
        expect(ast.where).to.be.null;
        expect(ast.groupby).to.be.null;
        expect(ast.orderby).to.be.null;
        expect(ast.limit).to.be.null;
    });

    it('should have appropriate types', () => {
        const ast = parser.parse('SELECT SQL_NO_CACHE DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        expect(ast.options).to.be.an('array');
        expect(ast.distinct).to.equal('DISTINCT');
        expect(ast.from).to.be.an('array');
        expect(ast.where).to.be.an('object');
        expect(ast.groupby).to.be.an('array');
        expect(ast.orderby).to.be.an('array');
        expect(ast.limit).to.be.an('array');
    });
});
