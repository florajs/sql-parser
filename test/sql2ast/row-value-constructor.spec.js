'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('row value constructor', () => {
    const parser = new Parser();

    it('should parse simple values', () => {
        const ast = parser.parse(`SELECT * FROM "user" WHERE (firstname, lastname) = ('John', 'Doe')`);

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: {
                type: 'expr_list',
                value: [
                    { column: 'firstname', table: null, type: 'column_ref' },
                    { column: 'lastname', table: null, type: 'column_ref' }
                ],
                parentheses: true
            },
            right: {
                type: 'expr_list',
                value: [
                    { type: 'string', value: 'John' },
                    { type: 'string', value: 'Doe' }
                ],
                parentheses: true
            }
        });
    });
});
