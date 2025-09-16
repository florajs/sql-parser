'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('from clause', () => {
    const parser = new Parser();

    it('should parse single table', () => {
        const ast = parser.parse('SELECT * FROM t');
        assert.deepEqual(ast.from, [{ db: null, table: 't', as: null }]);
    });

    it('should parse tables from other databases', () => {
        const ast = parser.parse('SELECT * FROM u.t');
        assert.deepEqual(ast.from, [{ db: 'u', table: 't', as: null }]);
    });

    it('should parse tables from other databases (ANSI identifier)', () => {
        const ast = parser.parse('SELECT * FROM "u"."t"');
        assert.deepEqual(ast.from, [{ db: 'u', table: 't', as: null }]);
    });

    it('should parse subselect', () => {
        const ast = parser.parse('SELECT * FROM (SELECT id FROM t1) someAlias');

        assert.deepEqual(ast.from, [
            {
                expr: {
                    with: null,
                    type: 'select',
                    options: null,
                    distinct: null,
                    from: [{ db: null, table: 't1', as: null }],
                    columns: [{ expr: { type: 'column_ref', table: null, column: 'id' }, as: null }],
                    where: null,
                    groupby: null,
                    having: null,
                    orderby: null,
                    limit: null,
                    parentheses: true
                },
                as: 'someAlias',
                lateral: false,
                columns: null
            }
        ]);
    });

    it('should parse DUAL table', () => {
        const ast = parser.parse('SELECT * FROM DUAL');
        assert.deepEqual(ast.from, [{ type: 'dual' }]);
    });

    describe('values', () => {
        it('should parse table constructors with single value row value constructors', () => {
            const ast = parser.parse('SELECT id FROM (VALUES (1), (2)) t (id)');

            assert.deepEqual(ast.from, [
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [{ type: 'number', value: 1 }]
                            },
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [{ type: 'number', value: 2 }]
                            }
                        ]
                    },
                    as: 't',
                    columns: ['id']
                }
            ]);
        });

        it('should parse table constructors with multi value row value constructors', () => {
            const ast = parser.parse('SELECT id1, id2 FROM (VALUES (1, 2), (3, 4)) t (id1, id2)');

            assert.deepEqual(ast.from, [
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [
                                    { type: 'number', value: 1 },
                                    { type: 'number', value: 2 }
                                ]
                            },
                            {
                                type: 'row_value',
                                keyword: false,
                                value: [
                                    { type: 'number', value: 3 },
                                    { type: 'number', value: 4 }
                                ]
                            }
                        ]
                    },
                    as: 't',
                    columns: ['id1', 'id2']
                }
            ]);
        });

        it('should parse table constructors with ROW keyword row value constructors', () => {
            const ast = parser.parse('SELECT * FROM (VALUES ROW(1, 2), ROW(3, 4)) t');

            assert.deepEqual(ast.from, [
                {
                    expr: {
                        type: 'values',
                        value: [
                            {
                                type: 'row_value',
                                keyword: true,
                                value: [
                                    { type: 'number', value: 1 },
                                    { type: 'number', value: 2 }
                                ]
                            },
                            {
                                type: 'row_value',
                                keyword: true,
                                value: [
                                    { type: 'number', value: 3 },
                                    { type: 'number', value: 4 }
                                ]
                            }
                        ]
                    },
                    as: 't',
                    columns: null
                }
            ]);
        });
    });

    describe('JSON_TABLE', () => {
        it('should parse column list w/ one column', () => {
            const ast = parser.parse(
                `SELECT jt.a FROM JSON_TABLE('[{"a":1},{"a":2}]', '$[*]' COLUMNS (a INT PATH '$.a')) jt`
            );

            assert.deepEqual(ast.from, [
                {
                    type: 'json_table',
                    expr: { type: 'string', value: '[{"a":1},{"a":2}]' },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'a',
                            dataType: { dataType: 'INT' },
                            path: { type: 'string', value: '$.a' }
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        it('should parse column list w/ multiple columns', () => {
            const ast = parser.parse(
                `SELECT jt.a FROM t, JSON_TABLE(t.data, '$[*]' COLUMNS (a INT PATH '$.a', b VARCHAR(10) PATH '$.b')) AS jt`
            );

            assert.deepEqual(ast.from, [
                {
                    table: 't',
                    db: null,
                    as: null
                },
                {
                    type: 'json_table',
                    expr: {
                        type: 'column_ref',
                        column: 'data',
                        table: 't'
                    },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'a',
                            dataType: { dataType: 'INT' },
                            path: { type: 'string', value: '$.a' }
                        },
                        {
                            type: 'json_table_column',
                            name: 'b',
                            dataType: { dataType: 'VARCHAR', length: 10 },
                            path: { type: 'string', value: '$.b' }
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        describe('ON EMPTY', () => {
            it('should parse NULL ON EMPTY', () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {}]', '$[*]' COLUMNS (a INT PATH '$.a' NULL ON EMPTY)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onEmpty: { expr: { type: 'null', value: null } }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });

            it('should parse DEFAULT ON EMPTY', () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {}]', '$[*]' COLUMNS (a INT PATH '$.a' DEFAULT '-1' ON EMPTY)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onEmpty: { default: true, expr: { type: 'string', value: '-1' } }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });

            it('should parse ERROR ON EMPTY', () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {}]', '$[*]' COLUMNS (a INT PATH '$.a' ERROR ON EMPTY)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onEmpty: { error: true }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });
        });

        describe('ON ERROR', () => {
            it('should parse NULL ON ERROR', async () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {"a":"foo"}]', '$[*]' COLUMNS (a INT PATH '$.a' NULL ON ERROR)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {"a":"foo"}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onError: { expr: { type: 'null', value: null } }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });

            it('should parse DEFAULT ON ERROR', () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {"a":"foo"}]', '$[*]' COLUMNS (a INT PATH '$.a' DEFAULT '-1' ON ERROR)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {"a":"foo"}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onError: { default: true, expr: { type: 'string', value: '-1' } }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });

            it('should parse ERROR ON ERROR', () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":1}, {"a":"foo"}]', '$[*]' COLUMNS (a INT PATH '$.a' ERROR ON ERROR)) jt`
                );

                assert.deepEqual(ast.from, [
                    {
                        type: 'json_table',
                        expr: { type: 'string', value: '[{"a":1}, {"a":"foo"}]' },
                        path: { type: 'string', value: '$[*]' },
                        columns: [
                            {
                                type: 'json_table_column',
                                name: 'a',
                                dataType: { dataType: 'INT' },
                                path: { type: 'string', value: '$.a' },
                                onError: { error: true }
                            }
                        ],
                        as: 'jt'
                    }
                ]);
            });
        });

        describe('should parse data types', () => {
            describe('strings', () => {
                ['CHAR', 'VARCHAR'].forEach((type) =>
                    it(`should parse ${type} in COLUMNS`, () => {
                        const ast = parser.parse(
                            `SELECT jt.a FROM JSON_TABLE('[{"a":"foo"}]', '$[*]' COLUMNS (a ${type}(5) PATH '$.a')) jt`
                        );

                        assert.ok(ast);
                    })
                );
            });

            describe('numbers', () => {
                ['INT', 'INTEGER', 'DECIMAL(10, 2)', 'BIGINT'].forEach((type) =>
                    it(`should parse ${type} in COLUMNS`, () => {
                        const ast = parser.parse(
                            `SELECT jt.a FROM JSON_TABLE('[{"a":"1"}]', '$[*]' COLUMNS (a ${type} PATH '$.a')) jt`
                        );

                        assert.ok(ast);
                    })
                );
            });

            describe('date/time', () => {
                ['DATE', 'TIME', 'TIMESTAMP'].forEach((type) =>
                    it(`should parse ${type} in COLUMNS`, () => {
                        const ast = parser.parse(
                            `SELECT jt.a FROM JSON_TABLE('[{"a":"1970-01-01"}]', '$[*]' COLUMNS (a ${type} PATH '$.a')) jt`
                        );

                        assert.ok(ast);
                    })
                );
            });

            it(`should parse BOOL in COLUMNS`, () => {
                const ast = parser.parse(
                    `SELECT jt.a FROM JSON_TABLE('[{"a":true}]', '$[*]' COLUMNS (a BOOL PATH '$.a')) jt`
                );

                assert.ok(ast);
            });
        });

        it('should parse column list w/ ordinality column', () => {
            const ast = parser.parse(
                `SELECT jt.a FROM JSON_TABLE('[{"a":1},{"a":2}]', '$[*]' COLUMNS (id FOR ORDINALITY, a INT PATH '$.a')) jt`
            );

            assert.deepEqual(ast.from, [
                {
                    type: 'json_table',
                    expr: { type: 'string', value: '[{"a":1},{"a":2}]' },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'id',
                            ordinality: true
                        },
                        {
                            type: 'json_table_column',
                            name: 'a',
                            dataType: { dataType: 'INT' },
                            path: { type: 'string', value: '$.a' }
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        it('should parse column list w/ EXISTS PATH column', () => {
            const ast = parser.parse(
                `SELECT jt.a FROM JSON_TABLE('[{"a":1},{"a":2}]', '$[*]' COLUMNS (a INT EXISTS PATH '$.a')) jt`
            );

            assert.deepEqual(ast.from, [
                {
                    type: 'json_table',
                    expr: { type: 'string', value: '[{"a":1},{"a":2}]' },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'a',
                            dataType: { dataType: 'INT' },
                            exists: true,
                            path: { type: 'string', value: '$.a' }
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        it('should parse column list w/ nested columns', () => {
            const ast = parser.parse(
                `SELECT jt.a
                 FROM JSON_TABLE(
                      '[{"a":1,"b":["foo","bar"]},{"a":2,"b":["foobar"]}]',
                      '$[*]' COLUMNS (
                          a INT EXISTS PATH '$.a',
                          NESTED PATH '$.b[*]' COLUMNS (b VARCHAR(10) PATH '$')
                      )
                ) jt`
            );

            assert.deepEqual(ast.from, [
                {
                    type: 'json_table',
                    expr: { type: 'string', value: '[{"a":1,"b":["foo","bar"]},{"a":2,"b":["foobar"]}]' },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'a',
                            dataType: { dataType: 'INT' },
                            exists: true,
                            path: { type: 'string', value: '$.a' }
                        },
                        {
                            type: 'json_table_column',
                            nested: true,
                            path: { type: 'string', value: '$.b[*]' },
                            columns: [
                                {
                                    type: 'json_table_column',
                                    name: 'b',
                                    dataType: { dataType: 'VARCHAR', length: 10 },
                                    path: { type: 'string', value: '$' }
                                }
                            ]
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        it('should parse column list w/ deeply nested columns', () => {
            const ast = parser.parse(
                `SELECT jt.id, jt.name, jt.project_title, jt.task_desc, jt.task_status
                 FROM JSON_TABLE(
                    '[{"id":1,"name":"Alice","projects":[{"title":"Project A","tasks":[{"description":"Design","status":"done"},{"description":"Build","status":"in progress"}]}]}]',
                    '$[*]' COLUMNS (
                        id INT PATH '$.id',
                        name VARCHAR(10) PATH '$.name',
                        NESTED PATH '$.projects[*]' COLUMNS (
                             project_title VARCHAR(10) PATH '$.title',
                             NESTED PATH '$.tasks[*]' COLUMNS (
                                 task_desc VARCHAR(100) PATH '$.description',
                                 task_status VARCHAR(100) PATH '$.status'
                             )
                        )
                    )
                ) jt`
            );

            assert.deepEqual(ast.from, [
                {
                    type: 'json_table',
                    expr: {
                        type: 'string',
                        value: '[{"id":1,"name":"Alice","projects":[{"title":"Project A","tasks":[{"description":"Design","status":"done"},{"description":"Build","status":"in progress"}]}]}]'
                    },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 'id',
                            dataType: { dataType: 'INT' },
                            path: { type: 'string', value: '$.id' }
                        },
                        {
                            type: 'json_table_column',
                            name: 'name',
                            dataType: { dataType: 'VARCHAR', length: 10 },
                            path: { type: 'string', value: '$.name' }
                        },
                        {
                            type: 'json_table_column',
                            nested: true,
                            path: { type: 'string', value: '$.projects[*]' },
                            columns: [
                                {
                                    type: 'json_table_column',
                                    name: 'project_title',
                                    dataType: { dataType: 'VARCHAR', length: 10 },
                                    path: { type: 'string', value: '$.title' }
                                },
                                {
                                    type: 'json_table_column',
                                    nested: true,
                                    path: { type: 'string', value: '$.tasks[*]' },
                                    columns: [
                                        {
                                            type: 'json_table_column',
                                            name: 'task_desc',
                                            path: { type: 'string', value: '$.description' },
                                            dataType: { dataType: 'VARCHAR', length: 100 }
                                        },
                                        {
                                            type: 'json_table_column',
                                            name: 'task_status',
                                            path: { type: 'string', value: '$.status' },
                                            dataType: { dataType: 'VARCHAR', length: 100 }
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });

        it('should parse joined JSON tables', () => {
            const ast = parser.parse(
                `SELECT t.id, jt.b
                 FROM t
                 JOIN JSON_TABLE(
                      '[{"id":1,"b":"foo"},{"id":2,"b":"bar"}]',
                      '$[*]' COLUMNS (
                          t_id INT PATH '$.id',
                          b VARCHAR(10) PATH '$.b'
                      )
                ) jt ON t.id = jt.t_id`
            );

            assert.deepEqual(ast.from, [
                { table: 't', db: null, as: null },
                {
                    join: 'INNER JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', column: 'id', table: 't' },
                        right: { type: 'column_ref', column: 't_id', table: 'jt' }
                    },
                    type: 'json_table',
                    expr: {
                        type: 'string',
                        value: '[{"id":1,"b":"foo"},{"id":2,"b":"bar"}]'
                    },
                    path: { type: 'string', value: '$[*]' },
                    columns: [
                        {
                            type: 'json_table_column',
                            name: 't_id',
                            dataType: { dataType: 'INT' },
                            path: { type: 'string', value: '$.id' }
                        },
                        {
                            type: 'json_table_column',
                            name: 'b',
                            dataType: { dataType: 'VARCHAR', length: 10 },
                            path: { type: 'string', value: '$.b' }
                        }
                    ],
                    as: 'jt'
                }
            ]);
        });
    });
});
