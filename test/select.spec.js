'use strict';

const expect = require('chai').expect;
const Parser = require('../lib/parser');

describe('select', () => {
    const parser = new Parser();
    let ast;

    it('should be null if empty', () => {
        ast = parser.parse('SELECT a');

        expect(ast.options).to.be.null;
        expect(ast.distinct).to.be.null;
        expect(ast.from).to.be.null;
        expect(ast.where).to.be.null;
        expect(ast.groupby).to.be.null;
        expect(ast.orderby).to.be.null;
        expect(ast.limit).to.be.null;
    });

    it('should have appropriate types', () => {
        ast = parser.parse('SELECT SQL_NO_CACHE DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        expect(ast.options).to.be.an('array');
        expect(ast.distinct).to.equal('DISTINCT');
        expect(ast.from).to.be.an('array');
        expect(ast.where).to.be.an('object');
        expect(ast.groupby).to.be.an('array');
        expect(ast.orderby).to.be.an('array');
        expect(ast.limit).to.be.an('array');
    });

    describe('column clause', () => {
        it('should parse "*" shorthand', () => {
            ast = parser.parse('SELECT * FROM t');
            expect(ast.columns).to.equal('*');
        });

        it('should parse "table.*" column expressions', () => {
            ast = parser.parse('SELECT t.* FROM t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', 'table': 't', column: '*' }, as: null }
            ]);
        });

        it('should parse aliases w/o "AS" keyword', () => {
            ast = parser.parse('SELECT a aa FROM  t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'a' }, as: 'aa' }
            ]);
        });

        it('should parse aliases w/ "AS" keyword', () => {
            ast = parser.parse('SELECT b.c as bc FROM t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', table: 'b', column: 'c' },  as: 'bc' }
            ]);
        });

        it('should parse expression', () => {
            ast = parser.parse('SELECT fun(d) FROM t');

            expect(ast.columns).to.eql([
                {
                    expr: {
                        type: 'function',
                        name: 'fun',
                        args: {
                            type  : 'expr_list',
                            value : [ { type: 'column_ref', table: null, column: 'd' } ]
                        }
                    },
                    as: null
                }
            ]);
        });

        it('should parse multiple columns', () => {
            ast = parser.parse('SELECT b.c as bc, 1+3 FROM t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', table: 'b', column: 'c' },  as: 'bc' },
                {
                    expr: {
                        type: 'binary_expr',
                        operator: '+',
                        left: { type: 'number', value: 1 },
                        right: { type: 'number', value: 3 }
                    },
                    as: null
                }
            ]);
        });
    });

    describe('from clause', () => {
        it('should parse single table', () => {
            ast = parser.parse('SELECT * FROM t');
            expect(ast.from).to.eql([{ db: null, table: 't', as: null }]);
        });

        it('should parse tables from other databases', () => {
            ast = parser.parse('SELECT * FROM u.t');
            expect(ast.from).to.eql([{ db: 'u', table: 't', as: null }]);
        });

        it('should parse tables from other databases (ANSI identifier)', () => {
            ast = parser.parse('SELECT * FROM "u"."t"');
            expect(ast.from).to.eql([{ db: 'u', table: 't', as: null }]);
        });


        it('should parse subselect', () => {
            ast = parser.parse('SELECT * FROM (SELECT id FROM t1) someAlias');

            expect(ast.from).to.eql([{
                expr: {
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
                as: 'someAlias'
            }]);
        });

        it('should parse implicit joins', () => {
            ast = parser.parse('SELECT * FROM t, a.b b, c.d as cd');

            expect(ast.from).to.eql([
                { db: null, table: 't', as: null },
                { db: 'a', table: 'b', as: 'b' },
                { db: 'c', table: 'd', as: 'cd' }
            ]);
        });

        it('should parse explicit joins', () => {
            ast = parser.parse('SELECT * FROM t join a.b b on t.a = b.c left join d on d.d = d.a');

            expect(ast.from).to.eql([
                { db: null, table: 't', as: null },
                {
                    db: 'a',
                    table: 'b',
                    as: 'b',
                    join: 'INNER JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 't', column: 'a' },
                        right: { type: 'column_ref', table: 'b', column: 'c' }
                    }
                },
                {
                    db: null,
                    table: 'd',
                    as: null,
                    join: 'LEFT JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 'd', column: 'd' },
                        right: { type: 'column_ref', table: 'd', column: 'a' }
                    }
                }
            ]);
        });

        it('should parse right joins', () => {
            ast = parser.parse('SELECT * FROM t inner join a.b b on t.a = b.c right join d on d.d = t.a');

            expect(ast.from).to.eql([
                { db: null, table: 't', as: null },
                {
                    db: 'a',
                    table: 'b',
                    as: 'b',
                    join: 'INNER JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 't', column: 'a' },
                        right: { type: 'column_ref', table: 'b', column: 'c' }
                    }
                },
                {
                    db: null,
                    table: 'd',
                    as: null,
                    join: 'RIGHT JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 'd', column: 'd' },
                        right: { type: 'column_ref', table: 't', column: 'a' }
                    }
                }
            ]);
        });

        it('should parse full joins', () => {
            ast = parser.parse('SELECT * FROM t join a.b b on t.a = b.c full join d on d.d = t.a');

            expect(ast.from).to.eql([
                { db: null, table: 't', as: null },
                {
                    db: 'a',
                    table: 'b',
                    as: 'b',
                    join: 'INNER JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 't', column: 'a' },
                        right: { type: 'column_ref', table: 'b', column: 'c' }
                    }
                },
                {
                    db: null,
                    table: 'd',
                    as: null,
                    join: 'FULL JOIN',
                    on: {
                        type: 'binary_expr',
                        operator: '=',
                        left: { type: 'column_ref', table: 'd', column: 'd' },
                        right: { type: 'column_ref', table: 't', column: 'a' }
                    }
                }
            ]);
        });

        it('should parse joined subselect', () => {
            ast = parser.parse('SELECT * FROM t1 JOIN (SELECT id, col1 FROM t2) someAlias ON t1.id = someAlias.id');

            expect(ast.from).to.eql([
                { db: null, table: 't1', as: null },
                {
                    expr: {
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
            ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id)');

            expect(ast.from).to.eql([
                { db: null, table: 't1', as: null },
                { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id'] }
            ]);
        });

        it('should parse joins with USING (multiple columns)', () => {
            ast = parser.parse('SELECT * FROM t1 JOIN t2 USING (id1, id2)');

            expect(ast.from).to.eql([
                { db: null, table: 't1', as: null },
                { db: null, table: 't2', as: null, join: 'INNER JOIN', using: ['id1', 'id2'] }
            ]);
        });

        it('should parse DUAL table', () => {
            ast = parser.parse('SELECT * FROM DUAL');
            expect(ast.from).to.eql([{ type: 'dual' }]);
        });
    });

    describe('where clause', () => {
        it('should parse single condition', () => {
            ast = parser.parse('SELECT * FROM t where t.a > 0');

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '>',
                left: { type: 'column_ref', table: 't', column: 'a' },
                right: { type: 'number', value: 0 }
            });
        });

        it('should parse single condition with boolean', () => {
            ast = parser.parse('SELECT * FROM t where t.a = TRUE');

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: 't', column: 'a' },
                right: { type: 'bool', value: true }
            });
        });

        it('should parse parameters', () => {
            ast = parser.parse('SELECT * FROM t where t.a > :my_param');

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '>',
                left: { type: 'column_ref', table: 't', column: 'a' },
                right: { type: 'param', value: 'my_param' }
            });
        });

        it('should parse map comparison', () => {
            ast = parser.parse('SELECT * FROM t where t.a[\'my_key\'] = \'hello\'');

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'map_ref', table: 't', column: 'a', key: 'my_key' },
                right: { type: 'string', value: 'hello' }
            });
        });

        it('should parse multiple conditions', () => {
            ast = parser.parse(`SELECT * FROM t where t.c between 1 and 't' AND Not true`);

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: 'AND',
                left: {
                    type: 'binary_expr',
                    operator: 'BETWEEN',
                    left: { type: 'column_ref', table: 't', column: 'c' },
                    right: {
                        type : 'expr_list',
                        value : [
                            { type: 'number', value: 1 },
                            { type: 'string', value: 't' }
                        ]
                    }
                },
                right: {
                    type: 'unary_expr',
                    operator: 'NOT',
                    expr: { type: 'bool', value: true }
                }
            });
        });

        ['is', 'is not'].forEach((operator) => {
            it(`should parse ${operator} condition`, () => {
                ast = parser.parse(`SELECT * FROM t WHERE "col" ${operator} NULL`);

                expect(ast.where).to.eql({
                    type: 'binary_expr',
                    operator: operator.toUpperCase(),
                    left: { type: 'column_ref', table: null, column: 'col' },
                    right: { type: 'null', value: null }
                });
            });
        });

        ['exists', 'not exists'].forEach((operator) => {
            it('should parse ' + operator.toUpperCase() + ' condition', () => {
                ast = parser.parse(`SELECT * FROM t WHERE ${operator} (SELECT 1)`);

                expect(ast.where).to.eql({
                    type: 'unary_expr',
                    operator: operator.toUpperCase(),
                    expr: {
                        type: 'select',
                        options: null,
                        distinct: null,
                        columns: [{ expr: { type: 'number', value: 1 }, as: null }],
                        from: null,
                        where: null,
                        groupby: null,
                        having: null,
                        orderby: null,
                        limit: null,
                        parentheses: true
                    }
                });
            });
        });
    });

    describe('limit clause', () => {
        it('should be parsed w/o offset', () => {
            ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

            expect(ast.limit).eql([
                { type: 'number', value: 0 },
                { type: 'number', value: 3 }
            ]);
        });

        it('should be parsed w/ offset', () => {
            ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 0, 3');

            expect(ast.limit).to.eql([
                {type: 'number', value: 0 },
                {type: 'number', value: 3 }
            ]);
        });
    });

    describe('group by clause', () => {
        it('should parse single columns', () => {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d');

            expect(ast.groupby).to.eql([{ type:'column_ref', table: null, column: 'd' }])
        });

        it('should parse multiple columns', () => {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d, t.b, t.c');

            expect(ast.groupby).to.eql([
                { type: 'column_ref', table: null, column: 'd' },
                { type: 'column_ref', table: 't', column: 'b' },
                { type: 'column_ref', table: 't', column: 'c' }
            ]);
        });
    });

    describe('having clause', () => {
        it('should parse single conditions', () => {
            ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING COUNT(*) > 1');

            expect(ast.having).to.eql({
                type: 'binary_expr',
                operator: '>',
                left: {
                    type: 'aggr_func',
                    name: 'COUNT',
                    args: { expr: { type: 'star', value: '*' } }
                },
                right: { type: 'number', value: 1 }
            });
        });

        it('should parse multiple conditions', () => {
            ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING SUM(col2) > 10 OR 1 = 1');

            expect(ast.having).to.eql({
                type: 'binary_expr',
                operator: 'OR',
                left: {
                    type: 'binary_expr',
                    operator: '>',
                    left: {
                        type: 'aggr_func',
                        name: 'SUM',
                        args: { expr: { type: 'column_ref', table: null, column: 'col2' } }
                    },
                    right: { type: 'number', value: 10 }
                },
                right: {
                    type: 'binary_expr',
                    operator: '=',
                    left: { type: 'number', value: 1 },
                    right: { type: 'number', value: 1 }
                }
            });
        });

        it('should parse subselects', () => {
            ast = parser.parse('SELECT col1 FROM t GROUP BY col2 HAVING SUM(col2) > (SELECT 10)');

            expect(ast.having).to.eql({
                type: 'binary_expr',
                operator: '>',
                left: {
                    type: 'aggr_func',
                    name: 'SUM',
                    args: { expr: { type: 'column_ref', table: null, column: 'col2' } }
                },
                right: {
                    type: 'select',
                    options: null,
                    distinct: null,
                    columns: [{ expr: { type: 'number', value: 10 }, as: null }],
                    from: null,
                    where: null,
                    groupby: null,
                    having: null,
                    orderby: null,
                    limit: null,
                    parentheses: true
                }
            });
        });
    });

    describe('order by clause', () => {
        it('should parse single column', () => {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d');

            expect(ast.orderby).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'd' }, type: 'ASC' }
            ]);
        });

        it('should parse multiple columns', () => {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d, t.b dEsc, t.c');

            expect(ast.orderby).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'd' },  type: 'ASC' },
                { expr: { type: 'column_ref', table: 't', column: 'b' }, type: 'DESC' },
                { expr: { type: 'column_ref', table: 't', column: 'c' }, type: 'ASC' }
            ]);
        });

        it('should parse expressions', () => {
            ast = parser.parse("SELECT a FROM b WHERE c = 0 order BY d, SuM(e)");

            expect(ast.orderby).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'd' },  type: 'ASC' },
                {
                    expr: {
                        type: 'aggr_func',
                        name: 'SUM',
                        args: { expr: { type: 'column_ref', table: null, column: 'e' } }
                    },
                    type: 'ASC'
                }
            ]);
        });
    });

    describe('MySQL SQL extensions', () => {
        it('should parse SQL_CALC_FOUND_ROWS', () => {
            ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS col FROM t');
            expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS']);
        });

        it('should parse SQL_CACHE/SQL_NO_CACHE', () => {
            ast = parser.parse('SELECT SQL_CACHE col FROM t');
            expect(ast.options).to.eql(['SQL_CACHE']);

            ast = parser.parse('SELECT SQL_NO_CACHE col FROM t');
            expect(ast.options).to.eql(['SQL_NO_CACHE']);
        });

        it('should parse SQL_SMALL_RESULT/SQL_BIG_RESULT', () => {
            ast = parser.parse('SELECT SQL_SMALL_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_SMALL_RESULT']);

            ast = parser.parse('SELECT SQL_BIG_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_BIG_RESULT']);
        });

        it('should parse SQL_BUFFER_RESULT', () => {
            ast = parser.parse('SELECT SQL_BUFFER_RESULT col FROM t');
            expect(ast.options).to.contain('SQL_BUFFER_RESULT');
        });

        it('should parse multiple options per query', () => {
            ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS SQL_BIG_RESULT SQL_BUFFER_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS', 'SQL_BIG_RESULT', 'SQL_BUFFER_RESULT']);
        });
    });

    describe('literals', () => {
        describe('strings', () => {
            it('should parse single quoted strings', () => {
                ast = parser.parse(`SELECT 'string'`);
                expect(ast.columns).to.eql([{ expr: { type: 'string', value: 'string' }, as: null }]);
            });

            it('should parse keywords in single quotes as string', () => {
                ast = parser.parse(`SELECT 'select'`);
                expect(ast.columns).to.eql([{ expr: { type: 'string', value: 'select' }, as: null }]);
            });
        });

        describe('datetime', () => {
            const literals = {
                time: '08:23:16',
                date: '1999-12-25',
                timestamp: '1999-12-25 08:23:16'
            };

            Object.keys(literals).forEach((type) => {
                const value = literals[type];

                [type, type.toUpperCase()].forEach((t) => {
                    it(t, () => {
                        ast = parser.parse(`SELECT ${t} '${value}'`);
                        expect(ast.columns).to.eql([{ expr: { type, value }, as: null }]);
                    });
                });
            });
        });
    });
});
