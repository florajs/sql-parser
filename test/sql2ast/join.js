'use strict';

const { expect } = require('chai');
const { Parser } = require('../../');

describe('joins', () => {
    const parser = new Parser();

    it('should parse implicit joins', () => {
        const ast = parser.parse('SELECT * FROM t, a.b b, c.d as cd');

        expect(ast.from).to.eql([
            { db: null, table: 't', as: null },
            { db: 'a', table: 'b', as: 'b' },
            { db: 'c', table: 'd', as: 'cd' }
        ]);
    });

    ['left', 'right', 'full'].forEach((join) => {
        [' ', ' outer '].forEach((outer) => {
            it(`should parse ${join}${outer}joins`, () => {
                const ast = parser.parse(`SELECT * FROM t ${join} ${outer} join d on d.d = d.a`);

                expect(ast.from).to.eql([
                    { db: null, table: 't', as: null },
                    {
                        db: null,
                        table: 'd',
                        as: null,
                        join: `${join.toUpperCase()} JOIN`,
                        on: {
                            type: 'binary_expr',
                            operator: '=',
                            left: { type: 'column_ref', table: 'd', column: 'd' },
                            right: { type: 'column_ref', table: 'd', column: 'a' }
                        }
                    }
                ]);
            });
        });
    });

    it('should parse joined subselect', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN (SELECT id, col1 FROM t2) someAlias ON t1.id = someAlias.id');

        expect(ast.from).to.eql([
            { db: null, table: 't1', as: null },
            {
                expr: {
                    with: null,
                    type: 'select',
                    options: null,
                    distinct: null,
                    from: [{ db: null, table: 't2', as: null }],
                    columns: [
                        { expr: { type: 'column_ref', table: null, 'column': 'id' }, as: null },
                        { expr: { type: 'column_ref', table: null, 'column': 'col1' }, as: null }
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
                }
            }
        ]);
    });

    it('should parse joins with USING (single column)', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id)');

        expect(ast.from).to.eql([
            { db: null, table: 't1', as: null },
            { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id'] }
        ]);
    });

    it('should parse joins with USING (multiple columns)', () => {
        const ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id1, id2)');

        expect(ast.from).to.eql([
            { db: null, table: 't1', as: null },
            { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id1', 'id2'] }
        ]);
    });
});
