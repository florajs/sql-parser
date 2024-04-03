'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('limit clause', () => {
    const parser = new Parser();

    it('should be parsed w/o offset', () => {
        const ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        assert.deepEqual(ast.limit, [
            { type: 'number', value: 0 },
            { type: 'number', value: 3 }
        ]);
    });

    it('should be parsed w/ offset', () => {
        const ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 0, 3');

        assert.deepEqual(ast.limit, [
            { type: 'number', value: 0 },
            { type: 'number', value: 3 }
        ]);
    });
});
