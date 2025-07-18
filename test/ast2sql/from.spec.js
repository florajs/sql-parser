'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('from clause', () => {
    it('should support subselects in FROM clause', () => {
        assert.equal(
            getParsedSql('SELECT * FROM (SELECT id FROM t1) AS someAlias'),
            'SELECT * FROM (SELECT "id" FROM "t1") AS "someAlias"'
        );
    });

    it('should parse DUAL table', () => {
        const sql = `SELECT "id" FROM DUAL`;
        assert.equal(getParsedSql(sql), sql);
    });

    describe('table value expressions', () => {
        it('should support expressions with single values', () => {
            assert.equal(
                getParsedSql('SELECT id FROM (VALUES (1), (2)) t(id)'),
                'SELECT "id" FROM (VALUES (1), (2)) AS "t" ("id")'
            );
        });

        it('should support expressions with multiple values', () => {
            assert.equal(
                getParsedSql('SELECT id FROM (VALUES (1, 2), (3, 4)) t(id)'),
                'SELECT "id" FROM (VALUES (1,2), (3,4)) AS "t" ("id")'
            );
        });

        it('should support expressions with ROW keyword', () => {
            assert.equal(
                getParsedSql('SELECT id1, id2 FROM (VALUES ROW(1, 2), ROW(3, 4)) t(id1, id2)'),
                'SELECT "id1", "id2" FROM (VALUES ROW(1,2), ROW(3,4)) AS "t" ("id1", "id2")'
            );
        });
    });

    describe('JSON_TABLE', () => {
        it('should support JSON_TABLE in FROM clause', () => {
            assert.equal(
                getParsedSql(`SELECT jt.id FROM JSON_TABLE('[{"id":1}]', '$[*]' COLUMNS (id INT PATH '$.id')) AS jt`),
                `SELECT "jt"."id" FROM JSON_TABLE('[{\\"id\\":1}]', '$[*]' COLUMNS ("id" INT PATH '$.id')) AS "jt"`
            );
        });

        it('should support implicit joins', () => {
            assert.equal(
                getParsedSql(`SELECT jt.id FROM t, JSON_TABLE(t.data, '$[*]' COLUMNS (id INT PATH '$.id')) AS jt`),
                `SELECT "jt"."id" FROM "t", JSON_TABLE("t"."data", '$[*]' COLUMNS ("id" INT PATH '$.id')) AS "jt"`
            );
        });

        it('should support JSON_TABLE in joins', () => {
            assert.equal(
                getParsedSql(
                    `SELECT jt.id FROM t JOIN JSON_TABLE('[{"id":1}]', '$[*]' COLUMNS (id INT PATH '$.id')) AS jt ON t.id = jt.id`
                ),
                `SELECT "jt"."id" FROM "t" INNER JOIN JSON_TABLE('[{\\"id\\":1}]', '$[*]' COLUMNS ("id" INT PATH '$.id')) AS "jt" ON "t"."id" = "jt"."id"`
            );
        });

        describe('columns', () => {
            it('should support multiple columns', () => {
                assert.equal(
                    getParsedSql(
                        `SELECT jt.id, jt.foo FROM JSON_TABLE('[{"id":1,"foo":"bar"}]', '$[*]' COLUMNS (id INT PATH '$.id', foo VARCHAR(5) PATH '$.foo')) AS jt`
                    ),
                    `SELECT "jt"."id", "jt"."foo" FROM JSON_TABLE('[{\\"id\\":1,\\"foo\\":\\"bar\\"}]', '$[*]' COLUMNS ("id" INT PATH '$.id', "foo" VARCHAR(5) PATH '$.foo')) AS "jt"`
                );
            });

            it('should support ordinality column', () => {
                assert.equal(
                    getParsedSql(
                        `SELECT jt.id, jt.foo FROM JSON_TABLE('[{"foo":"bar"}]', '$[*]' COLUMNS (id FOR ORDINALITY, foo VARCHAR(5) PATH '$.foo')) AS jt`
                    ),
                    `SELECT "jt"."id", "jt"."foo" FROM JSON_TABLE('[{\\"foo\\":\\"bar\\"}]', '$[*]' COLUMNS ("id" FOR ORDINALITY, "foo" VARCHAR(5) PATH '$.foo')) AS "jt"`
                );
            });

            it('should support EXISTS keyword for paths', () => {
                assert.equal(
                    getParsedSql(
                        `SELECT jt.foo, jt.bar FROM JSON_TABLE('[{"foo":"bar"}]', '$[*]' COLUMNS (foo VARCHAR(5) PATH '$.foo', bar INT EXISTS PATH '$.bar')) AS jt`
                    ),
                    `SELECT "jt"."foo", "jt"."bar" FROM JSON_TABLE('[{\\"foo\\":\\"bar\\"}]', '$[*]' COLUMNS ("foo" VARCHAR(5) PATH '$.foo', "bar" INT EXISTS PATH '$.bar')) AS "jt"`
                );
            });

            it('should support nested columns', () => {
                assert.equal(
                    getParsedSql(`
                        SELECT *
                        FROM JSON_TABLE(
                            '[{"id":1,"name":"Alice","projects":[{"title":"Project A"}]}]',
                            '$[*]' COLUMNS (
                                user_id INT PATH '$.id',
                                user_name VARCHAR(100) PATH '$.name',
                                NESTED PATH '$.projects[*]' COLUMNS (
                                    project_title VARCHAR(100) PATH '$.title'
                                )
                            )
                        ) AS jt
                    `),
                    `SELECT * FROM JSON_TABLE('[{\\"id\\":1,\\"name\\":\\"Alice\\",\\"projects\\":[{\\"title\\":\\"Project A\\"}]}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_name" VARCHAR(100) PATH '$.name', NESTED PATH '$.projects[*]' COLUMNS ("project_title" VARCHAR(100) PATH '$.title'))) AS "jt"`
                );
            });

            it('should support deeply nested columns', () => {
                assert.equal(
                    getParsedSql(`
                        SELECT *
                        FROM JSON_TABLE(
                            '[{"id":1,"name":"Alice","projects":[{"title":"Project A","tasks":[{"description":"Design","status":"done"},{"description":"Build","status":"in progress"}]}]}]',
                            '$[*]' COLUMNS (
                                user_id INT PATH '$.id',
                                user_name VARCHAR(100) PATH '$.name',
                                NESTED PATH '$.projects[*]' COLUMNS (
                                    project_title VARCHAR(100) PATH '$.title',
                                    NESTED PATH '$.tasks[*]' COLUMNS (
                                        task_desc VARCHAR(100) PATH '$.description',
                                        task_status VARCHAR(50) PATH '$.status'
                                    )
                                )
                            )
                       ) AS jt
                    `),
                    `SELECT * FROM JSON_TABLE('[{\\"id\\":1,\\"name\\":\\"Alice\\",\\"projects\\":[{\\"title\\":\\"Project A\\",\\"tasks\\":[{\\"description\\":\\"Design\\",\\"status\\":\\"done\\"},{\\"description\\":\\"Build\\",\\"status\\":\\"in progress\\"}]}]}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_name" VARCHAR(100) PATH '$.name', NESTED PATH '$.projects[*]' COLUMNS ("project_title" VARCHAR(100) PATH '$.title', NESTED PATH '$.tasks[*]' COLUMNS ("task_desc" VARCHAR(100) PATH '$.description', "task_status" VARCHAR(50) PATH '$.status')))) AS "jt"`
                );
            });

            describe('ON EMPTY', () => {
                it('should handle NULL', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_name VARCHAR(100) PATH '$.name' NULL ON EMPTY
                                )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_name" VARCHAR(100) PATH '$.name' NULL ON EMPTY)) AS "jt"`
                    );
                });

                it('should handle DEFAULT', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_name VARCHAR(100) PATH '$.name' DEFAULT '"not available"' ON EMPTY
                                )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_name" VARCHAR(100) PATH '$.name' DEFAULT '\\"not available\\"' ON EMPTY)) AS "jt"`
                    );
                });

                it('should handle ERROR', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_name VARCHAR(100) PATH '$.name' ERROR ON EMPTY
                                )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_name" VARCHAR(100) PATH '$.name' ERROR ON EMPTY)) AS "jt"`
                    );
                });
            });

            describe('ON ERROR', () => {
                it('should handle NULL', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1,"age":"abc"}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_age INT PATH '$.age' NULL ON ERROR
                               )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1,\\"age\\":\\"abc\\"}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_age" INT PATH '$.age' NULL ON ERROR)) AS "jt"`
                    );
                });

                it('should handle DEFAULT', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1,"age":"abc"}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_age INT PATH '$.age' DEFAULT '99' ON ERROR
                                )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1,\\"age\\":\\"abc\\"}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_age" INT PATH '$.age' DEFAULT '99' ON ERROR)) AS "jt"`
                    );
                });

                it('should handle ERROR', () => {
                    assert.equal(
                        getParsedSql(`
                            SELECT *
                            FROM JSON_TABLE(
                                '[{"id":1,"age":"abc"}]',
                                '$[*]' COLUMNS (
                                    user_id INT PATH '$.id',
                                    user_age INT PATH '$.age' ERROR ON ERROR
                                )
                           ) AS jt
                        `),
                        `SELECT * FROM JSON_TABLE('[{\\"id\\":1,\\"age\\":\\"abc\\"}]', '$[*]' COLUMNS ("user_id" INT PATH '$.id', "user_age" INT PATH '$.age' ERROR ON ERROR)) AS "jt"`
                    );
                });
            });
        });
    });
});
