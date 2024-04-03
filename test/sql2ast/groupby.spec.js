'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('group by clause', () => {
    const parser = new Parser();

    it('should parse single columns', () => {
        const ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d');

        assert.deepEqual(ast.groupby, [{ type: 'column_ref', table: null, column: 'd' }]);
    });

    it('should parse multiple columns', () => {
        const ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d, t.b, t.c');

        assert.deepEqual(ast.groupby, [
            { type: 'column_ref', table: null, column: 'd' },
            { type: 'column_ref', table: 't', column: 'b' },
            { type: 'column_ref', table: 't', column: 'c' }
        ]);
    });
});
