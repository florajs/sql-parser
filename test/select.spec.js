'use strict';

var expect = require('chai').expect;
var Parser = require('../lib/parser');

describe('select', function () {
    var ast,
        parser = new Parser();

    it('should be null if empty', function () {
        ast = parser.parse('SELECT a');

        expect(ast.options).to.be.null;
        expect(ast.distinct).to.be.null;
        expect(ast.from).to.be.null;
        expect(ast.where).to.be.null;
        expect(ast.groupby).to.be.null;
        expect(ast.orderby).to.be.null;
        expect(ast.limit).to.be.null;
    });

    it('should have appropriate types', function () {
        ast = parser.parse('SELECT SQL_NO_CACHE DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

        expect(ast.options).to.be.an('array');
        expect(ast.distinct).to.equal('DISTINCT');
        expect(ast.from).to.be.an('array');
        expect(ast.where).to.be.an('object');
        expect(ast.groupby).to.be.an('array');
        expect(ast.orderby).to.be.an('array');
        expect(ast.limit).to.be.an('array');
    });

    describe('column clause', function () {
        it('should parse "*" shorthand', function () {
            ast = parser.parse('SELECT * FROM t');
            expect(ast.columns).to.equal('*');
        });

        it('should parse aliases w/o "AS" keyword', function () {
            ast = parser.parse('SELECT a aa FROM  t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'a' }, as: 'aa' }
            ]);
        });

        it('should parse aliases w/ "AS" keyword', function () {
            ast = parser.parse('SELECT b.c as bc FROM t');

            expect(ast.columns).to.eql([
                { expr: { type: 'column_ref', table: 'b', column: 'c' },  as: 'bc' }
            ]);
        });

        it('should parse expression', function () {
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

        it('should parse multiple columns', function () {
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

    describe('from clause', function () {
        it('should parse single table', function () {
            ast = parser.parse('SELECT * FROM t');
            expect(ast.from).to.eql([{ db: null, table: 't', as: null }]);
        });

        it('should parse implicit joins', function () {
            ast = parser.parse('SELECT * FROM t, a.b b, c.d as cd');

            expect(ast.from).to.eql([
                { db: null, table: 't', as: null },
                { db: 'a', table: 'b', as: 'b' },
                { db: 'c', table: 'd', as: 'cd' }
            ]);
        });

        it('should parse explicit joins', function () {
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

        it('should parse joined subquery', function () {
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
    });

    describe('where clause', function () {
        it('should parse single condition', function () {
            ast = parser.parse('SELECT * FROM t where t.a > 0');

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '>',
                left: { type: 'column_ref', table: 't', column: 'a' },
                right: { type: 'number', value: 0 }
            });
        });

        it('should parse multiple conditions', function () {
            ast = parser.parse('SELECT * FROM t where t.c between 1 and "t" AND Not true');

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
    });

    describe('limit clause', function () {
        it('should be parsed w/o offset', function () {
            ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 3');

            expect(ast.limit).eql([
                { type: 'number', value: 0 },
                { type: 'number', value: 3 }
            ]);
        });

        it('should be parsed w/ offset', function () {
            ast = parser.parse('SELECT DISTINCT a FROM b WHERE c = 0 GROUP BY d ORDER BY e limit 0, 3');

            expect(ast.limit).to.eql([
                {type: 'number', value: 0 },
                {type: 'number', value: 3 }
            ]);
        });
    });

    describe('group by clause', function () {
        it('should parse single columns', function () {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d');

            expect(ast.groupby).to.eql([{ type:'column_ref', table: null, column: 'd' }])
        });

        it('should parse multiple columns', function () {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 GROUP BY d, t.b, t.c');

            expect(ast.groupby).to.eql([
                { type: 'column_ref', table: null, column: 'd' },
                { type: 'column_ref', table: 't', column: 'b' },
                { type: 'column_ref', table: 't', column: 'c' }
            ]);
        });
    });

    describe('order by clause', function () {
        it('should parse single column', function () {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d');

            expect(ast.orderby).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'd' }, type: 'ASC' }
            ]);
        });

        it('should parse multiple columns', function () {
            ast = parser.parse('SELECT a FROM b WHERE c = 0 order BY d, t.b dEsc, t.c');

            expect(ast.orderby).to.eql([
                { expr: { type: 'column_ref', table: null, column: 'd' },  type: 'ASC' },
                { expr: { type: 'column_ref', table: 't', column: 'b' }, type: 'DESC' },
                { expr: { type: 'column_ref', table: 't', column: 'c' }, type: 'ASC' }
            ]);
        });

        it('should parse expressions', function () {
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

    describe('MySQL SQL extensions', function () {
        it('should parse SQL_CALC_FOUND_ROWS', function () {
            ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS col FROM t');
            expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS']);
        });

        it('should parse SQL_CACHE/SQL_NO_CACHE', function () {
            ast = parser.parse('SELECT SQL_CACHE col FROM t');
            expect(ast.options).to.eql(['SQL_CACHE']);

            ast = parser.parse('SELECT SQL_NO_CACHE col FROM t');
            expect(ast.options).to.eql(['SQL_NO_CACHE']);
        });

        it('should parse SQL_SMALL_RESULT/SQL_BIG_RESULT', function () {
            ast = parser.parse('SELECT SQL_SMALL_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_SMALL_RESULT']);

            ast = parser.parse('SELECT SQL_BIG_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_BIG_RESULT']);
        });

        it('should parse SQL_BUFFER_RESULT', function () {
            ast = parser.parse('SELECT SQL_BUFFER_RESULT col FROM t');
            expect(ast.options).to.contain('SQL_BUFFER_RESULT');
        });

        it('should parse multiple options per query', function () {
            ast = parser.parse('SELECT SQL_CALC_FOUND_ROWS SQL_BIG_RESULT SQL_BUFFER_RESULT col FROM t');
            expect(ast.options).to.eql(['SQL_CALC_FOUND_ROWS', 'SQL_BIG_RESULT', 'SQL_BUFFER_RESULT']);
        });
    });
});
