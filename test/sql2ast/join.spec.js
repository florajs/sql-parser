'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('joins', () => {
    const parser = new Parser();

    it('should parse implicit joins', () => {
        const ast = parser.parse('SELECT * FROM t, a.b b, c.d as cd');

        assert.deepEqual(ast.from, [
            { db: null, table: 't', as: null },
            { db: 'a', table: 'b', as: 'b' },
            { db: 'c', table: 'd', as: 'cd' }
        ]);
    });

    ['left', 'right', 'full'].forEach((join) => {
        [' ', ' outer '].forEach((outer) => {
            it(`should parse ${join}${outer}joins`, () => {
                const ast = parser.parse(`SELECT * FROM t ${join} ${outer} join d on t.d = d.a`);

                assert.deepEqual(ast.from, [
                    { db: null, table: 't', as: null },
                    {
                        db: null,
                        table: 'd',
                        as: null,
                        join: `${join.toUpperCase()} JOIN`,
                        on: {
                            type: 'binary_expr',
                            operator: '=',
                            left: { type: 'column_ref', table: 't', column: 'd' },
                            right: { type: 'column_ref', table: 'd', column: 'a' }
                        }
                    }
                ]);
            });
        });
    });

    it('should parse joined subselect', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN (SELECT id, col1 FROM t2) someAlias ON t1.id = someAlias.id');

        assert.deepEqual(ast.from, [
            { db: null, table: 't1', as: null },
            {
                expr: {
                    with: null,
                    type: 'select',
                    options: null,
                    distinct: null,
                    from: [{ db: null, table: 't2', as: null }],
                    columns: [
                        { expr: { type: 'column_ref', table: null, column: 'id' }, as: null },
                        { expr: { type: 'column_ref', table: null, column: 'col1' }, as: null }
                    ],
                    where: null,
                    groupby: null,
                    having: null,
                    orderby: null,
                    limit: null,
                    parentheses: true
                },
                as: 'someAlias',
                join: 'INNER JOIN',
                on: {
                    type: 'binary_expr',
                    operator: '=',
                    left: { type: 'column_ref', table: 't1', column: 'id' },
                    right: { type: 'column_ref', table: 'someAlias', column: 'id' }
                },
                lateral: false,
                columns: null
            }
        ]);
    });

    it('should parse joins with USING (single column)', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id)');

        assert.deepEqual(ast.from, [
            { db: null, table: 't1', as: null },
            { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id'] }
        ]);
    });

    it('should parse joins with USING (multiple columns)', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id1, id2)');

        assert.deepEqual(ast.from, [
            { db: null, table: 't1', as: null },
            { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id1', 'id2'] }
        ]);
    });

    it('should parse LATERAL joins', () => {
        const ast = parser.parse(
            'SELECT * FROM t1 JOIN LATERAL (SELECT id FROM t2 WHERE t1.id = t2.t1id) AS subselect ON TRUE'
        );
        const [, lateralJoin] = ast.from;

        assert.ok(Object.hasOwn(lateralJoin, 'lateral'));
        assert.equal(lateralJoin.lateral, true);
    });

    it('should parse derived column list with single column', () => {
        const ast = parser.parse('SELECT id FROM (SELECT 1) t(id)');
        const [subSelect] = ast.from;

        assert.ok(Object.hasOwn(subSelect, 'columns'));
        assert.deepEqual(subSelect.columns, ['id']);
    });

    it('should parse derived column list with multiple columns', () => {
        const ast = parser.parse('SELECT id1, id2 FROM (SELECT 1, 2) t(id1, id2)');
        const [subSelect] = ast.from;

        assert.ok(Object.hasOwn(subSelect, 'columns'));
        assert.deepEqual(subSelect.columns, ['id1', 'id2']);
    });
});
