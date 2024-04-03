'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser, util } = require('../../');
const { getParsedSql } = require('./util');

describe('order clause', () => {
    it('should support implicit sort order', () => {
        assert.equal(getParsedSql('SELECT a FROM t order by id'), 'SELECT "a" FROM "t" ORDER BY "id" ASC');
    });

    it('should support explicit sort order', () => {
        assert.equal(getParsedSql('SELECT a FROM t order by id desc'), 'SELECT "a" FROM "t" ORDER BY "id" DESC');
    });

    it('should support multiple expressions', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t order by id desc, name asc'),
            'SELECT "a" FROM "t" ORDER BY "id" DESC, "name" ASC'
        );
    });

    it('should support complex expressions', () => {
        assert.equal(getParsedSql('SELECT a FROM t ORDER BY rand() ASC'), 'SELECT "a" FROM "t" ORDER BY rand() ASC');
    });

    it('should not generate an empty ORDER BY clause on empty arrays', () => {
        const ast = new Parser().parse('SELECT a FROM t');
        ast.orderby = [];
        assert.equal(util.astToSQL(ast), 'SELECT "a" FROM "t"');
    });
});
