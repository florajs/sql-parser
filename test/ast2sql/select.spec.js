'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('select', () => {
    it('should parse ANSI SQL compliant statements', () => {
        const sql = `SELECT "id", 'foo' AS "type" FROM "table"`;
        assert.equal(getParsedSql(sql), sql);
    });

    describe('union operator', () => {
        it('should combine multiple statements', () => {
            assert.equal(
                getParsedSql(`select 1 union select '1' union select a from t union (select true)`),
                `SELECT 1 UNION SELECT '1' UNION SELECT "a" FROM "t" UNION SELECT TRUE`
            );
        });

        it('should be supported in expressions', () => {
            const sql = `select * from (select 1 union select 2) t`;
            assert.equal(getParsedSql(sql), `SELECT * FROM (SELECT 1 UNION SELECT 2) AS "t"`);
        });
    });

    describe('unsupported statements', () => {
        const unsupportedStatements = {
            insert: 'INSERT INTO t (col1, col2) VALUES (1, 2)',
            update: 'UPDATE t SET col1 = 5 WHERE id = 1337'
        };

        Object.keys(unsupportedStatements).forEach((stmtType) => {
            it(`should throw exception for ${stmtType} statements`, () => {
                assert.throws(() => getParsedSql(unsupportedStatements[stmtType]), {
                    name: 'Error',
                    message: 'Only SELECT statements supported at the moment'
                });
            });
        });
    });
});
