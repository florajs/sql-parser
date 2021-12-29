'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('limit clause', () => {
    const parser = new Parser();

    it('should be parsed w/o offset', () => {
        const ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        expect(ast.limit).eql([
            { type: 'number', value: 0 },
            { type: 'number', value: 3 }
        ]);
    });

    it('should be parsed w/ offset', () => {
        const ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 0, 3');

        expect(ast.limit).to.eql([
            { type: 'number', value: 0 },
            { type: 'number', value: 3 }
        ]);
    });
});
