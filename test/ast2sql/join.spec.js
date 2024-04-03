'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('joins', () => {
    it('should support implicit joins', () => {
        assert.equal(getParsedSql('SELECT a.col , b.c FROM a ,b'), 'SELECT "a"."col", "b"."c" FROM "a", "b"');
    });

    it('should support (INNER) JOINs', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t1 join t2 on t1.t2id = t2.t1id'),
            'SELECT "a" FROM "t1" INNER JOIN "t2" ON "t1"."t2id" = "t2"."t1id"'
        );
    });

    it('should support LEFT JOINs', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t1 left join t2 on t1.t2id = t2.t1id'),
            'SELECT "a" FROM "t1" LEFT JOIN "t2" ON "t1"."t2id" = "t2"."t1id"'
        );
    });

    it('should support RIGHT JOINs', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t1 right join t2 on t1.t2id = t2.t1id'),
            'SELECT "a" FROM "t1" RIGHT JOIN "t2" ON "t1"."t2id" = "t2"."t1id"'
        );
    });

    it('should support FULL JOINs', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t1 full join t2 on t1.t2id = t2.t1id'),
            'SELECT "a" FROM "t1" FULL JOIN "t2" ON "t1"."t2id" = "t2"."t1id"'
        );
    });

    it('should support multiple joins', () => {
        assert.equal(
            getParsedSql('SELECT a FROM t1 LEFT JOIN t2 ON t1.t2id = t2.t1id INNER JOIN t3 ON t1.t3id = t3.t1id'),
            'SELECT "a" FROM "t1" LEFT JOIN "t2" ON "t1"."t2id" = "t2"."t1id" INNER JOIN "t3" ON "t1"."t3id" = "t3"."t1id"'
        );
    });

    it('should support alias for base table', () => {
        assert.equal(getParsedSql('SELECT col1 FROM awesome_table t'), 'SELECT "col1" FROM "awesome_table" AS "t"');
    });

    it('should support joins with tables from other databases', () => {
        assert.equal(
            getParsedSql('SELECT col1 FROM t JOIN otherdb.awesome_table at ON t.id = at.tid'),
            'SELECT "col1" FROM "t" INNER JOIN otherdb."awesome_table" AS "at" ON "t"."id" = "at"."tid"'
        );
    });

    it('should support aliases in joins', () => {
        assert.equal(
            getParsedSql('SELECT col1 FROM t1 LEFT JOIN awesome_table AS t2 ON t1.id = t2.t1id'),
            'SELECT "col1" FROM "t1" LEFT JOIN "awesome_table" AS "t2" ON "t1"."id" = "t2"."t1id"'
        );
    });

    it('should support joined subquery', () => {
        assert.equal(
            getParsedSql('SELECT * FROM t1 LEFT JOIN (SELECT id, col1 FROM t2) AS someAlias ON t1.id = someAlias.id'),
            'SELECT * FROM "t1" LEFT JOIN (SELECT "id", "col1" FROM "t2") AS "someAlias" ON "t1"."id" = "someAlias"."id"'
        );
    });

    it('should support USING keyword (single column)', () => {
        assert.equal(
            getParsedSql('SELECT * FROM t1 JOIN t2 USING (id)'),
            'SELECT * FROM "t1" INNER JOIN "t2" USING ("id")'
        );
    });

    it('should support USING keyword (multiple columns)', () => {
        assert.equal(
            getParsedSql('SELECT * FROM t1 JOIN t2 USING (id1, id2)'),
            'SELECT * FROM "t1" INNER JOIN "t2" USING ("id1", "id2")'
        );
    });

    it('should support LATERAL joins', () => {
        assert.equal(
            getParsedSql('SELECT * FROM t1 join lateral (SELECT id FROM t2 WHERE t1.id = t2.t1id) alias ON true'),
            'SELECT * FROM "t1" INNER JOIN LATERAL (SELECT "id" FROM "t2" WHERE "t1"."id" = "t2"."t1id") AS "alias" ON TRUE'
        );
    });

    describe('derived table columns', () => {
        it('should support single column in "base table"', () => {
            assert.equal(getParsedSql('SELECT id FROM (SELECT 1) t (id)'), 'SELECT "id" FROM (SELECT 1) AS "t" ("id")');
        });

        it('should parse multiple columns in "base table"', () => {
            assert.equal(
                getParsedSql('SELECT id1, id2 FROM (SELECT 1, 2) t (id1, id2)'),
                'SELECT "id1", "id2" FROM (SELECT 1, 2) AS "t" ("id1", "id2")'
            );
        });

        it('should support single column in joins', () => {
            assert.equal(
                getParsedSql('SELECT id FROM t1 JOIN (SELECT 1) t2 (id) ON TRUE'),
                'SELECT "id" FROM "t1" INNER JOIN (SELECT 1) AS "t2" ("id") ON TRUE'
            );
        });

        it('should support multiple columns in joins', () => {
            assert.equal(
                getParsedSql('SELECT id1, id2 FROM t1 JOIN (SELECT 1, 2) t2 (id1, id2) ON TRUE'),
                'SELECT "id1", "id2" FROM "t1" INNER JOIN (SELECT 1, 2) AS "t2" ("id1", "id2") ON TRUE'
            );
        });
    });
});
