'use strict';

const { expect } = require('chai');
const { Parser, util } = require('../../');
const { getParsedSql } = require('./util');

describe('order clause', () => {
    it('should support implicit sort order', () => {
        const sql = 'SELECT a FROM t order by id';
        expect(getParsedSql(sql)).to.equal('SELECT "a" FROM "t" ORDER BY "id" ASC');
    });

    it('should support explicit sort order', () => {
        const sql = 'SELECT a FROM t order by id desc';
        expect(getParsedSql(sql)).to.equal('SELECT "a" FROM "t" ORDER BY "id" DESC');
    });

    it('should support multiple expressions', () => {
        const sql = 'SELECT a FROM t order by id desc, name asc';
        expect(getParsedSql(sql)).to.equal('SELECT "a" FROM "t" ORDER BY "id" DESC, "name" ASC');
    });

    it('should support complex expressions', () => {
        expect(getParsedSql('SELECT a FROM t ORDER BY rand() ASC')).to.equal('SELECT "a" FROM "t" ORDER BY rand() ASC');
    });

    it('should not generate an empty ORDER BY clause on empty arrays', () => {
        const ast = new Parser().parse('SELECT a FROM t');
        ast.orderby = [];
        expect(util.astToSQL(ast)).to.equal('SELECT "a" FROM "t"');
    });
});
