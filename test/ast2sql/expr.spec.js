'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { util } = require('../../');
const { getParsedSql } = require('./util');

describe('expressions', () => {
    ["'", '"', 'n', 't', '\\'].forEach((char) => {
        it(`should escape char ${char} "`, () => {
            const sql = `SELECT ' escape \\${char}'`;
            assert.equal(getParsedSql(sql), sql);
        });
    });

    it('should support boolean values', () => {
        const sql = 'SELECT false, true';
        assert.equal(getParsedSql(sql), 'SELECT FALSE, TRUE');
    });

    it('should support parentheses', () => {
        const sql = 'SELECT (2 + 3) * 4';
        assert.equal(getParsedSql(sql), sql);
    });

    it('should support unary operators', () => {
        const sql = 'SELECT (not true), !t.foo as foo FROM t';
        assert.equal(getParsedSql(sql), 'SELECT (NOT TRUE), NOT "t"."foo" AS "foo" FROM "t"');
    });

    ['distinct', 'all'].forEach((quantifier) => {
        it(`should support "${quantifier}" quantifier in aggregate functions`, () => {
            const sql = `SELECT COUNT(${quantifier} t.id) FROM t`;
            assert.equal(getParsedSql(sql), `SELECT COUNT(${quantifier.toUpperCase()} "t"."id") FROM "t"`);
        });
    });

    it('should throw an exception for undefined values', () => {
        // @florajs/datasource-mysql uses plain values instead of equivalent expressions, so expressions
        // have to be created by SQL parser
        assert.throws(() => util.createBinaryExpr('=', { type: 'column_ref', table: null, column: 'id' }, undefined), {
            name: 'ImplementationError'
        });
    });

    describe('case', () => {
        it('should support case-when', () => {
            const sql = `select case when 1 then 'one' when 2 then 'two' END`;
            assert.equal(getParsedSql(sql), `SELECT CASE WHEN 1 THEN 'one' WHEN 2 THEN 'two' END`);
        });

        it('should support case-when-else', () => {
            const sql = `select case FUNC(a) when 1 then 'one' when 2 then 'two' else 'more' END FROM t`;
            assert.equal(
                getParsedSql(sql),
                `SELECT CASE FUNC("a") WHEN 1 THEN 'one' WHEN 2 THEN 'two' ELSE 'more' END FROM "t"`
            );
        });
    });

    describe('casts', () => {
        Object.entries({
            'simple casts': ['SELECT CAST(col AS CHAR) FROM t', 'SELECT CAST("col" AS CHAR) FROM "t"'],
            'signed integer casts': [
                'SELECT CAST(col as unsigned integer) FROM t',
                'SELECT CAST("col" AS UNSIGNED INTEGER) FROM "t"'
            ],
            'simple decimal casts': ['SELECT CAST(col AS DECIMAL) FROM t', 'SELECT CAST("col" AS DECIMAL) FROM "t"'],
            'decimal casts with precision': [
                'SELECT CAST(col AS DECIMAL(4)) FROM t',
                'SELECT CAST("col" AS DECIMAL(4)) FROM "t"'
            ],
            'decimal casts with precision and scale': [
                'SELECT CAST(col AS DECIMAL(6, 2)) FROM t',
                'SELECT CAST("col" AS DECIMAL(6, 2)) FROM "t"'
            ],
            'json casts': [
                `SELECT CAST('{"foo":"bar"}' AS JSON) FROM dual`,
                `SELECT CAST('{\\"foo\\":\\"bar\\"}' AS JSON) FROM "dual"`
            ]
        }).forEach(([cast, [inputQuery, expectedQuery]]) => {
            it(`should support ${cast}`, () => {
                assert.equal(getParsedSql(inputQuery), expectedQuery);
            });
        });
    });

    describe('functions', () => {
        it('should support functions', () => {
            const sql = `SELECT md5('foo')`;
            assert.equal(getParsedSql(sql), sql);
        });

        it('should support if function', () => {
            assert.equal(
                getParsedSql(`SELECT IF(col1 = 'xyz', 'foo', 'bar') FROM t`),
                `SELECT IF("col1" = 'xyz', 'foo', 'bar') FROM "t"`
            );
        });
    });
});
