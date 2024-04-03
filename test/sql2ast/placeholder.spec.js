'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser, util } = require('../../');

describe('placeholder', () => {
    const parser = new Parser();
    let ast;

    it('should replace single parameter', () => {
        ast = parser.parse('SELECT col FROM t WHERE id = :id');
        ast = util.replaceParams(ast, { id: 1 });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: null, column: 'id' },
            right: { type: 'number', value: 1 }
        });
    });

    it('should replace multiple parameters', () => {
        ast = parser.parse('SELECT col FROM t WHERE id = :id AND "type" = :type');
        ast = util.replaceParams(ast, { id: 1, type: 'foobar' });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: 'AND',
            left: {
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'id' },
                right: { type: 'number', value: 1 }
            },
            right: {
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'type' },
                right: { type: 'string', value: 'foobar' }
            }
        });
    });

    it('should set parameter with string', () => {
        ast = parser.parse('SELECT col1 FROM t WHERE col2 = :name');
        ast = util.replaceParams(ast, { name: 'John Doe' });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: null, column: 'col2' },
            right: { type: 'string', value: 'John Doe' }
        });
    });

    it('should set parameter with boolean value', () => {
        ast = parser.parse('SELECT col1 FROM t WHERE isMain = :main');
        ast = util.replaceParams(ast, { main: true });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: null, column: 'isMain' },
            right: { type: 'bool', value: true }
        });
    });

    it('should set parameter with null value', () => {
        ast = parser.parse('SELECT col1 FROM t WHERE col2 = :param');
        ast = util.replaceParams(ast, { param: null });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: null, column: 'col2' },
            right: { type: 'null', value: null }
        });
    });

    it('should set parameter with array as value', () => {
        ast = parser.parse('SELECT col1 FROM t WHERE id = :ids');
        ast = util.replaceParams(ast, { ids: [1, 3, 5, 7] });

        assert.deepEqual(ast.where, {
            type: 'binary_expr',
            operator: '=',
            left: { type: 'column_ref', table: null, column: 'id' },
            right: {
                type: 'expr_list',
                value: [
                    { type: 'number', value: 1 },
                    { type: 'number', value: 3 },
                    { type: 'number', value: 5 },
                    { type: 'number', value: 7 }
                ]
            }
        });
    });

    it('should throw an exception if no value for parameter is available', () => {
        ast = parser.parse('SELECT col FROM t WHERE id = :id');

        assert.throws(() => util.replaceParams(ast, { foo: 'bar' }), {
            name: 'Error',
            message: 'no value for parameter :id found'
        });
    });

    it('should return new AST object', () => {
        ast = parser.parse('SELECT col FROM t WHERE id = :id');
        const resolvedParamAST = util.replaceParams(ast, { id: 1 });

        assert.notDeepEqual(ast, resolvedParamAST);
    });
});
