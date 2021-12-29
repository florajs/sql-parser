'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('group by clause', () => {
    const parser = new Parser();

    it('should parse single columns', () => {
        const ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d');

        expect(ast.groupby).to.eql([{ type: 'column_ref', table: null, column: 'd' }]);
    });

    it('should parse multiple columns', () => {
        const ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d, t.b, t.c');

        expect(ast.groupby).to.eql([
            { type: 'column_ref', table: null, column: 'd' },
            { type: 'column_ref', table: 't', column: 'b' },
            { type: 'column_ref', table: 't', column: 'c' }
        ]);
    });
});
