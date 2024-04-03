'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('literals', () => {
    it('should support string values', () => {
        const sql = `SELECT 'foo'`;
        assert.equal(getParsedSql(sql), `SELECT 'foo'`);
    });

    it('should support null values', () => {
        const sql = 'SELECT null';
        assert.equal(getParsedSql(sql), 'SELECT NULL');
    });

    it('should support trailing zeros', () => {
        assert.equal(getParsedSql('SELECT 042'), 'SELECT 42');
        assert.equal(getParsedSql('SELECT -042'), 'SELECT -42');
    });

    describe('datetime', () => {
        Object.entries({
            time: '08:23:16',
            date: '1999-12-25',
            timestamp: '1999-12-25 08:23:16'
        }).forEach(([type, value]) => {
            it(type, () => {
                const sql = `SELECT ${type} '${value}'`;
                assert.equal(getParsedSql(sql), `SELECT ${type.toUpperCase()} '${value}'`);
            });
        });
    });

    describe('interval', () => {
        it('should parse simple INTERVAL', () => {
            const sql = 'SELECT NOW() + INTERVAL 1 DAY FROM DUAL';
            assert.equal(getParsedSql(sql), `SELECT NOW() + INTERVAL '1' DAY FROM DUAL`);
        });

        it('should parse string INTERVAL', () => {
            const sql = `SELECT NOW() + INTERVAL '1' DAY FROM DUAL`;
            assert.equal(getParsedSql(sql), sql);
        });

        it('should parse signed INTERVAL', () => {
            const sql = `SELECT NOW() + INTERVAL - '1' DAY FROM DUAL`;
            assert.equal(getParsedSql(sql), sql);
        });
    });
});
