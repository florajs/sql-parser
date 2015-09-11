'use strict';

var sqlKeywords = require('../parser/keywords');
var escapeMap = {
    '\0': '\\0',
    '\'': '\\\'',
    '\"': '\\\"',
    '\b': '\\b',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\x1a': '\\Z', // EOF
    '\\': '\\\\'
};

var exprToSQLConvertFn = {
    'aggr_func': aggrToSQL,
    'binary_expr': binaryToSQL,
    'case': caseToSQL,
    'cast': castToSQL,
    'column_ref': columnRefToSQL,
    'expr_list': function (expr) {
        return getExprListSQL(expr.value);
    },
    'function': funcToSQL,
    'select': function (expr) {
        var str = selectToSQL(expr);
        if (expr.parentheses) str = '(' + str + ')';
        return str;
    },
    'unary_expr': unaryToSQL
};

module.exports = toSQL;

function toSQL(ast) {
    if (ast.type !== 'select') throw new Error('Only SELECT statements supported at the moment');
    return unionToSQL(ast);
}

/**
 * @param {Object}  stmt
 * @param {?Array}  stmt.options
 * @param {?string} stmt.distinct
 * @param {?Array}  stmt.columns
 * @param {?Array}  stmt.from
 * @param {?Array}  stmt.groupby
 * @param {?Array}  stmt.orderby
 * @param {?Array}  stmt.limit
 * @return {string}
 */
function selectToSQL(stmt) {
    var clauses = ['SELECT'],
        orderExpressions;

    if (stmt.hasOwnProperty('options') && Array.isArray(stmt.options)) clauses.push(stmt.options.join(' '));
    if (stmt.hasOwnProperty('distinct') && stmt.distinct !== null) clauses.push(stmt.distinct);

    if (stmt.columns !== '*') clauses.push(columnsToSQL(stmt.columns));
    else clauses.push('*');

    // FROM + joins
    if (Array.isArray(stmt.from)) clauses.push('FROM', tablesToSQL(stmt.from));

    if (stmt.hasOwnProperty('where') && stmt.where !== null) clauses.push('WHERE ' + exprToSQL(stmt.where));
    if (Array.isArray(stmt.groupby)) clauses.push('GROUP BY', getExprListSQL(stmt.groupby).join(', '));
    if (stmt.hasOwnProperty('having') && stmt.having !== null) clauses.push('HAVING ' + exprToSQL(stmt.having));

    if (Array.isArray(stmt.orderby)) {
        orderExpressions = stmt.orderby.map(function (expr) {
            return exprToSQL(expr.expr) + ' ' + expr.type;
        });
        clauses.push('ORDER BY', orderExpressions.join(', '));
    }

    if (Array.isArray(stmt.limit)) clauses.push('LIMIT', stmt.limit.map(exprToSQL));

    return clauses.join(' ');
}

function unionToSQL(stmt) {
    var res = [selectToSQL(stmt)];

    while (stmt._next) {
        res.push('UNION', selectToSQL(stmt._next));
        stmt = stmt._next;
    }

    return res.join(' ');
}

function castToSQL(expr) {
    var str;

    str = 'CAST(';
    str += exprToSQL(expr.expr) + ' AS ';
    str += expr.target.dataType + (expr.target.length ? '(' + expr.target.length + ')' : '');
    str += ')';

    return str;
}

function exprToSQL(expr) {
    return exprToSQLConvertFn[expr.type] ? exprToSQLConvertFn[expr.type](expr) : literalToSQL(expr);
}

function unaryToSQL(expr) {
    var str = expr.operator + ' ' + exprToSQL(expr.expr);
    return !expr.parentheses ? str : '(' + str + ')';
}

function binaryToSQL(expr) {
    var operator = expr.operator,
        rstr = exprToSQL(expr.right),
        str;

    if (Array.isArray(rstr)) {
        if (operator === '=') operator = 'IN';
        if (operator === '!=') operator = 'NOT IN';
        if (operator === 'BETWEEN') rstr = rstr[0] + ' AND ' + rstr[1];
        else rstr = '(' + rstr.join(', ') + ')';
    }

    str = exprToSQL(expr.left) + ' ' + operator + ' ' + rstr;

    return !expr.parentheses ? str : '(' + str + ')';
}

function aggrToSQL(expr) {
    /** @type {Object} */
    var args = expr.args,
        str = exprToSQL(args.expr),
        fnName = expr.name;

    if (fnName === 'COUNT') {
        if (args.hasOwnProperty('distinct') && args.distinct !== null) str = 'DISTINCT ' + str;
    }

    return fnName + '(' + str + ')';
}

function funcToSQL(expr) {
    var str = expr.name + '(' + exprToSQL(expr.args).join(', ') + ')';
    return !expr.parentheses ? str : '(' + str + ')';
}

function columnRefToSQL(expr) {
    var str = expr.column;

    if (sqlKeywords[str.toUpperCase()]) str = '"' + str + '"';
    if (expr.hasOwnProperty('table') && expr.table !== null) str = expr.table + '.' + str;

    return !expr.parentheses ? str : '(' + str + ')';
}

function getExprListSQL(exprList) {
    return exprList.map(exprToSQL);
}

function literalToSQL(literal) {
    var type = literal.type,
        value = literal.value;

    if (type === 'number') { /* nothing */ }
    else if (type === 'string') value = '\'' + escape(value) + '\'';
    else if (type === 'bool') value = value ? 'TRUE' : 'FALSE';
    else if (type === 'null') value = 'NULL';
    else if (type === 'star') value = '*';

    return !literal.parentheses ? value : '(' + value + ')';
}

function escape(str) {
    var res = [], char, escaped;

    for (var i = 0, l = str.length; i < l; ++i) {
        char = str[i];
        if ((escaped = escapeMap[char])) char = escaped;
        res.push(char);
    }

    return res.join('');
}

function caseToSQL(expr) {
    var res = ['CASE'], conditions = expr.args;

    if (expr.expr) res.push(exprToSQL(expr.expr));

    for (var i = 0, l = conditions.length; i < l; ++i) {
        res.push(conditions[i].type.toUpperCase()); // when/else
        if (conditions[i].cond) {
            res.push(exprToSQL(conditions[i].cond));
            res.push('THEN');
        }
        res.push(exprToSQL(conditions[i].result));
    }

    res.push('END');

    return res.join(' ');
}

/**
 * Stringify column expressions
 *
 * @param {Array} columns
 * @return {string}
 */
function columnsToSQL(columns) {
    return columns
        .map(function (column) {
            var str = exprToSQL(column.expr);

            if (column.as !== null) {
                str += ' AS ';
                if (sqlKeywords[column.as.toUpperCase()]) str += '"' + column.as + '"';
                else if (!column.as.match(/^[a-z_][0-9a-z_]*$/i)) str += '\'' + column.as + '\'';
                else str += column.as;
            }

            return str;
        })
        .join(', ');
}

/**
 * @param {Array} tables
 * @return {string}
 */
function tablesToSQL(tables) {
    var baseTable = tables[0],
        clauses = [],
        str = baseTable.table ? baseTable.table : exprToSQL(baseTable.expr);

    if (baseTable.db && baseTable.db !== null) str = baseTable.db + '.' + str;
    if (baseTable.as !== null) str += ' AS ' + baseTable.as;

    clauses.push(str);

    for (var i = 1; i < tables.length; i++) {
        var joinExpr = tables[i];

        str = (joinExpr.join && joinExpr.join !== null) ? ' ' + joinExpr.join + ' ' : str = ', ';

        if (joinExpr.table) {
            if (joinExpr.db !== null) str += (joinExpr.db + '.');
            str += joinExpr.table;
        } else {
            str += exprToSQL(joinExpr.expr);
        }

        if (joinExpr.as !== null) str += ' AS ' + joinExpr.as;
        if (joinExpr.hasOwnProperty('on') && joinExpr.on !== null) str += ' ON ' + exprToSQL(joinExpr.on);

        clauses.push(str);
    }

    return clauses.join('');
}
