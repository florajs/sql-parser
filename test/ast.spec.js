'use strict';

var expect = require('chai').expect;
var Parser = require('../lib/parser');
var util   = require('../lib/util');
var ImplementationError = require('flora-errors').ImplementationError;

describe('AST',function () {
    var sql, parser = new Parser();

    function getParsedSql(sql) {
        var ast = parser.parse(sql);
        return util.astToSQL(ast);
    }

    describe('select statement', function () {
        it('should support MySQL query options', function () {
            sql = 'SELECT SQL_CALC_FOUND_ROWS SQL_BUFFER_RESULT col1 FROM t';
            expect(getParsedSql(sql)).to.equal(sql);
        });

        describe('expression', function () {
            it('should support asterisk', function () {
                sql = 'SELECT * FROM t';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should escape reserved keywords', function () {
                sql = 'SELECT col."select" FROM t';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should escape reserved keywords in aliases', function () {
                sql = 'SELECT col AS "index" FROM t';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should escape aliases with non-identifier chars (/a-z0-9_/i)', function () {
                sql = 'SELECT col AS \'foo bar\' FROM t';
                expect(getParsedSql(sql)).to.contain('col AS \'foo bar\'');
            });

            ["'", '"', 'n', 't', '\\'].forEach(function (char) {
                it('should escape char "' + char + '"', function () {
                    sql = "SELECT ' escape \\" + char + " '";
                    expect(getParsedSql(sql)).to.equal(sql);
                });
            });

            it('should support boolean values', function () {
                sql = 'SELECT false, true';
                expect(getParsedSql(sql)).to.equal('SELECT FALSE, TRUE');
            });

            it('should support string values', function () {
                sql = 'SELECT col1, \'foo\' AS bar';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support null values', function () {
                sql = 'SELECT null';
                expect(getParsedSql(sql)).to.equal('SELECT NULL');
            });

            it('should support parentheses', function () {
                sql = 'SELECT (2 + 3) * 4';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support functions', function () {
                sql = 'SELECT md5(\'foo\')';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support aggregate functions', function () {
                sql = 'SELECT COUNT(distinct t.id) FROM t';
                expect(getParsedSql(sql)).to.equal('SELECT COUNT(DISTINCT t.id) FROM t');
            });

            it('should support unary operators', function () {
                sql = 'SELECT (not true), !t.foo as foo FROM t';
                expect(getParsedSql(sql)).to.equal('SELECT (NOT TRUE), NOT t.foo AS foo FROM t');
            });

            it('should support casts', function () {
                sql = 'SELECT CAST(col AS INTEGER) FROM t';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support subselects', function () {
                sql = 'SELECT \'string\', (SELECT col FROM t2) subSelect FROM t1';
                expect(getParsedSql(sql)).to.equal('SELECT \'string\', (SELECT col FROM t2) AS subSelect FROM t1');
            });

            it('should support subselects in FROM clause', function () {
                sql = 'SELECT * FROM (SELECT id FROM t1) AS someAlias';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should throw an exception for undefined values', function () {
                // flora-mysql uses plain values instead of equivalent expressions, so expressions
                // have to be created by SQL parser
                expect(function () {
                    util.createBinaryExpr(
                        '=',
                        { type: 'column_ref', table: null, column: 'id' },
                        undefined
                    );
                }).to.throw(ImplementationError)
            });
        });

        describe('joins', function () {
            it('should support implicit joins', function () {
                sql = 'SELECT a , b.c FROM a ,b';
                expect(getParsedSql(sql)).to.equal('SELECT a, b.c FROM a, b');
            });

            it('should support (INNER) JOINs', function () {
                sql = 'SELECT a FROM t1 join t2 on t1.t2id = t2.t1id';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t1 INNER JOIN t2 ON t1.t2id = t2.t1id');
            });

            it('should support LEFT JOINs', function () {
                sql = 'SELECT a FROM t1 left join t2 on t1.t2id = t2.t1id';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t1 LEFT JOIN t2 ON t1.t2id = t2.t1id');
            });

            it('should support multiple joins', function () {
                sql = 'SELECT a FROM t1 LEFT JOIN t2 ON t1.t2id = t2.t1id INNER JOIN t3 ON t1.t3id = t3.t1id';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support alias for base table', function () {
                sql = 'SELECT col1 FROM awesome_table t';
                expect(getParsedSql(sql)).to.equal('SELECT col1 FROM awesome_table AS t');
            });

            it('should support joins with tables from other databases', function () {
                sql = 'SELECT col1 FROM t JOIN otherdb.awesome_table at ON t.id = at.tid';
                expect(getParsedSql(sql)).to.equal('SELECT col1 FROM t INNER JOIN otherdb.awesome_table AS at ON t.id = at.tid');
            });

            it('should support aliases in joins', function () {
                sql = 'SELECT col1 FROM t1 LEFT JOIN awesome_table AS t2 ON t1.id = t2.t1id';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support joined subquery', function () {
                sql = 'SELECT * FROM t1 LEFT JOIN (SELECT id, col1 FROM t2) AS someAlias ON t1.id = someAlias.id';
                expect(getParsedSql(sql)).to.equal(sql);
            });
        });

        describe('where clause', function () {
            ['<', '<=', '=', '!=', '>=', '>'].forEach(function (operator) {
                it('should support simple "' + operator + '" comparison', function () {
                    sql = 'SELECT a fRom db.t wHERE type ' + operator + ' 3';
                    expect(getParsedSql(sql)).to.equal('SELECT a FROM db.t WHERE type ' + operator + ' 3');
                });
            });

            var operatorMap = { '=': 'IN', '!=': 'NOT IN' };
            Object.keys(operatorMap).forEach(function (operator) {
                var sqlOperator = operatorMap[operator];

                it('should convert "' + operator + '" to ' + sqlOperator + ' operator for array values', function () {
                    var ast = {
                        type: 'select',
                        options: null,
                        distinct: null,
                        columns: [{ expr: { type: 'column_ref', table: null, column: 'a' }, as: null }],
                        from: [{ db: null, table: 't', as: null }],
                        where: {
                            type: 'binary_expr',
                            operator: operator,
                            left: { type: 'column_ref', table: null, column: 'id' },
                            right: {
                                type: 'expr_list',
                                value: [{ type: 'number', value: 1 }, { type: 'number', value: 2 }]
                            }
                        },
                        groupby: null,
                        limit: null
                    };

                    expect(util.astToSQL(ast)).to.equal('SELECT a FROM t WHERE id ' + sqlOperator + ' (1, 2)');
                });
            });

            ['IN', 'NOT IN'].forEach(function (operator) {
                it('should support ' + operator + ' operator', function () {
                    sql = 'SELECT a FROM t WHERE id ' + operator.toLowerCase() + ' (1, 2, 3)';
                    expect(getParsedSql(sql)).to.equal('SELECT a FROM t WHERE id ' + operator + ' (1, 2, 3)');
                });
            });

            it('should support BETWEEN operator', function () {
                sql = 'SELECT a FROM t WHERE id between \'1\' and 1337';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t WHERE id BETWEEN \'1\' AND 1337');
            });

            it('should support boolean values', function () {
                sql = 'SELECT col1 FROM t WHERE col2 = false';
                expect(getParsedSql(sql)).to.equal('SELECT col1 FROM t WHERE col2 = FALSE');
            });

            it('should support string values', function () {
                sql = 'SELECT col1 FROM t WHERE col2 = \'foobar\'';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support null values', function () {
                sql = 'SELECT col1 FROM t WHERE col2 IS NULL';
                expect(getParsedSql(sql)).to.equal(sql);
            });

            it('should support array values', function () {
                sql = 'SELECT col1 FROM t WHERE col2 IN (1, 3, 5, 7)';
                expect(getParsedSql(sql)).to.equal(sql);
            });
        });

        describe('group clause', function () {
            it('should support single expressions', function () {
                sql = 'SELECT a FROM t group by t.b';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t GROUP BY t.b');
            });

            it('should support multiple expressions', function () {
                sql = 'SELECT a FROM t GROUP BY t.b, tc';
                expect(getParsedSql(sql)).to.equal(sql);
            });
        });

        describe('order clause', function () {
            it('should support implicit sort order', function () {
                sql = 'SELECT a FROM t order by id';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t ORDER BY id ASC');
            });

            it('should support explicit sort order', function () {
                sql = 'SELECT a FROM t order by id desc';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t ORDER BY id DESC');
            });

            it('should support multiple expressions', function () {
                sql = 'SELECT a FROM t order by id desc, name asc';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t ORDER BY id DESC, name ASC');
            });

            it('should support complex expressions', function () {
                sql = 'SELECT a FROM t ORDER BY rand() ASC';
                expect(getParsedSql(sql)).to.equal(sql);
            });
        });

        describe('limit clause', function () {
            it('should work w/o offset', function () {
                sql = 'SELECT a FROM t limit 10';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t LIMIT 0,10');
            });

            it('should work w/ offset', function () {
                sql = 'SELECT a FROM t limit 10, 10';
                expect(getParsedSql(sql)).to.equal('SELECT a FROM t LIMIT 10,10');
            });
        });

        describe('union operator', function () {
            it('should combine multiple statements', function () {
                sql = 'select 1 union select \'1\' union select a from t union (select true)';
                expect(getParsedSql(sql)).to.equal('SELECT 1 UNION SELECT \'1\' UNION SELECT a FROM t UNION SELECT TRUE');
            });
        });
    });

    describe('control flow', function () {
        describe('case operator', function () {
            it('should support case-when', function () {
                sql = 'select case when 1 then "one" when 2 then "two" END';
                expect(getParsedSql(sql)).to.equal('SELECT CASE WHEN 1 THEN \'one\' WHEN 2 THEN \'two\' END');
            });

            it('should support case-when-else', function () {
                sql = 'select case FUNC(a) when 1 then "one" when 2 then "two" else "more" END FROM t';
                expect(getParsedSql(sql)).to.equal('SELECT CASE FUNC(a) WHEN 1 THEN \'one\' WHEN 2 THEN \'two\' ELSE \'more\' END FROM t');
            });
        });

        describe('if function', function() {
            it('should support simple calls', function () {
                sql = 'SELECT IF(col1 = \'xyz\', \'foo\', \'bar\') FROM t';
                expect(getParsedSql(sql)).to.equal(sql);
            });
        });
    });

    describe('placeholder', function () {
        var ast;

        it('should replace single parameter', function () {
            ast = parser.parse('SELECT col FROM t WHERE id = :id');
            ast = util.replaceParams(ast, { id: 1 });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'id' },
                right: { type: 'number', value: 1 }
            });
        });

        it('should replace multiple parameters', function () {
            ast = parser.parse('SELECT col FROM t WHERE id = :id AND type = :type');
            ast = util.replaceParams(ast, { id: 1, type: 'foobar' });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: 'AND',
                left: {
                    type: 'binary_expr',
                    operator: '=',
                    left: { type: 'column_ref', table: null, column: 'id' },
                    right: { type: 'number', value: 1 }
                },
                right: {
                    type: 'binary_expr',
                    operator: '=',
                    left: { type: 'column_ref', table: null, column: 'type' },
                    right: { type: 'string', value: 'foobar' }
                }
            });
        });

        it('should set parameter with string', function () {
            ast = parser.parse('SELECT col1 FROM t WHERE col2 = :name');
            ast = util.replaceParams(ast, { name: 'John Doe' });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'col2' },
                right: { type: 'string', value: 'John Doe' }
            });
        });

        it('should set parameter with boolean value', function () {
            ast = parser.parse('SELECT col1 FROM t WHERE isMain = :main');
            ast = util.replaceParams(ast, { main: true });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'isMain' },
                right: { type: 'bool', value: true }
            });
        });

        it('should set parameter with null value', function () {
            ast = parser.parse('SELECT col1 FROM t WHERE col2 = :param');
            ast = util.replaceParams(ast, { param: null });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'col2' },
                right: { type: 'null', value: null }
            });
        });

        it('should set parameter with array as value', function () {
            ast = parser.parse('SELECT col1 FROM t WHERE id = :ids');
            ast = util.replaceParams(ast, { ids: [1, 3, 5, 7] });

            expect(ast.where).to.eql({
                type: 'binary_expr',
                operator: '=',
                left: { type: 'column_ref', table: null, column: 'id' },
                right: {
                    type: 'expr_list',
                    value: [
                        { type: 'number', value: 1 },
                        { type: 'number', value: 3 },
                        { type: 'number', value: 5 },
                        { type: 'number', value: 7 }
                    ]
                }
            });
        });

        it('should throw an exception if no value for parameter is available', function () {
            ast = parser.parse('SELECT col FROM t WHERE id = :id');

            expect(function () {
                util.replaceParams(ast, { foo: 'bar' });
            }).to.throw('no value for parameter :id found');
        });

        it('should return new AST object', function () {
            var resolvedParamAST;

            ast = parser.parse('SELECT col FROM t WHERE id = :id');
            resolvedParamAST = util.replaceParams(ast, { id: 1 });

            expect(ast).to.not.eql(resolvedParamAST);
        });
    });

    describe('unsupported statements', function () {
        var unsupportedStatements = {
            insert: 'INSERT INTO t (col1, col2) VALUES (1, 2)',
            update: 'UPDATE t SET col1 = 5 WHERE id = 1337'
        };

        Object.keys(unsupportedStatements).forEach(function (stmtType) {
            it('should throw exception for ' + stmtType + ' statements', function () {
                expect(function () {
                    getParsedSql(unsupportedStatements[stmtType]);
                }).to.throw(Error, 'Only SELECT statements supported at the moment');
            });
        });
    });
});
