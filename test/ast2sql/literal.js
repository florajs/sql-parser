'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('literals', () => {
    it('should support string values', () => {
        const sql = `SELECT 'foo'`;
        expect(getParsedSql(sql)).to.equal(`SELECT 'foo'`);
    });

    it('should support null values', () => {
        const sql = 'SELECT null';
        expect(getParsedSql(sql)).to.equal('SELECT NULL');
    });

    it('should support trailing zeros', () => {
        expect(getParsedSql('SELECT 042')).equal('SELECT 42');
        expect(getParsedSql('SELECT -042')).equal('SELECT -42');
    });

    describe('datetime', () => {
        Object.entries({
            time: '08:23:16',
            date: '1999-12-25',
            timestamp: '1999-12-25 08:23:16'
        }).forEach(([type, value]) => {
            it(type, () => {
                const sql = `SELECT ${type} '${value}'`;
                expect(getParsedSql(sql)).to.equal(`SELECT ${type.toUpperCase()} '${value}'`);
            });
        });
    });

    describe('interval', () => {
        it('should parse simple INTERVAL', () => {
            const sql = 'SELECT NOW() + INTERVAL 1 DAY FROM DUAL';
            expect(getParsedSql(sql)).to.equal(`SELECT NOW() + INTERVAL '1' DAY FROM DUAL`);
        });

        it('should parse string INTERVAL', () => {
            const sql = `SELECT NOW() + INTERVAL '1' DAY FROM DUAL`;
            expect(getParsedSql(sql)).to.equal(sql);
        });

        it('should parse signed INTERVAL', () => {
            const sql = `SELECT NOW() + INTERVAL - '1' DAY FROM DUAL`;
            expect(getParsedSql(sql)).to.equal(sql);
        });
    });
});
