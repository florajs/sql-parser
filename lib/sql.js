'use strict';

const has = require('has');

const escapeMap = {
    '\0': '\\0',
    "'": "\\'",
    '"': '\\"',
    '\b': '\\b',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\x1a': '\\Z', // EOF
    '\\': '\\\\'
};

function escape(str) {
    return str
        .split('')
        .map((char) => (!has(escapeMap, char) ? char : escapeMap[char]))
        .join('');
}

function identifierToSql(ident) {
    return `"${ident}"`;
}

function literalToSQL(literal) {
    const { type } = literal;
    let { value } = literal;

    if (type === 'number') {
        /* nothing */
    } else if (type === 'string') value = "'" + escape(value) + "'";
    else if (type === 'bool') value = value ? 'TRUE' : 'FALSE';
    else if (type === 'null') value = 'NULL';
    else if (type === 'star') value = '*';
    else if (['time', 'date', 'timestamp'].includes(type)) value = `${type.toUpperCase()} '${value}'`;
    else if (type === 'param') value = ':' + value;
    else if (type === 'interval') {
        const sign = literal.sign ? literal.sign + ' ' : '';
        value = `INTERVAL ${sign}'${escape(value)}' ${literal.qualifier}`;
    }

    return !literal.parentheses ? value : '(' + value + ')';
}

function aggrToSQL({ name: fnName, quantifier, args }) {
    return fnName + '(' + (quantifier ? quantifier + ' ' : '') + exprToSQL(args.expr) + ')';
}

function binaryToSQL(expr) {
    let operator = expr.operator;
    let rstr = exprToSQL(expr.right);

    if (Array.isArray(rstr)) {
        if (operator === '=') operator = 'IN';
        if (operator === '!=') operator = 'NOT IN';
        if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') rstr = rstr[0] + ' AND ' + rstr[1];
        else rstr = '(' + rstr.join(', ') + ')';
    }

    const str = exprToSQL(expr.left) + ' ' + operator + ' ' + rstr;

    return !expr.parentheses ? str : '(' + str + ')';
}

function caseToSQL(expr) {
    const res = ['CASE'];
    const conditions = expr.args;

    if (expr.expr) res.push(exprToSQL(expr.expr));

    for (let i = 0, l = conditions.length; i < l; ++i) {
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

function castToSQL(expr) {
    let str = 'CAST(';
    str += exprToSQL(expr.expr) + ' AS ';
    str += expr.target.dataType + (expr.target.length ? '(' + expr.target.length + ')' : '');
    str += ')';

    return str;
}

function columnRefToSQL(expr) {
    let str = expr.column !== '*' ? identifierToSql(expr.column) : '*';
    if (has(expr, 'table') && expr.table !== null) str = identifierToSql(expr.table) + '.' + str;
    return !expr.parentheses ? str : '(' + str + ')';
}

function getExprListSQL(exprList) {
    return exprList.map(exprToSQL);
}

function funcToSQL(expr) {
    const str = expr.name + '(' + exprToSQL(expr.args).join(', ') + ')';
    return !expr.parentheses ? str : '(' + str + ')';
}

/**
 * Stringify column expressions
 *
 * @param {Array} columns
 * @return {string}
 */
function columnsToSQL(columns) {
    return columns
        .map((column) => {
            let str = exprToSQL(column.expr);

            if (column.as !== null) {
                str += ' AS ';
                if (column.as.match(/^[a-z_][0-9a-z_]*$/i)) str += identifierToSql(column.as);
                else str += '"' + column.as + '"';
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
    const baseTable = tables[0];
    const clauses = [];
    if (baseTable.type === 'dual') return 'DUAL';
    let str = baseTable.table ? identifierToSql(baseTable.table) : exprToSQL(baseTable.expr);

    if (baseTable.db) str = baseTable.db + '.' + str;
    if (baseTable.as !== null) str += ' AS ' + identifierToSql(baseTable.as);
    if (Array.isArray(baseTable.columns) && baseTable.columns.length) {
        str += ' (' + baseTable.columns.map(identifierToSql).join(', ') + ')';
    }

    clauses.push(str);

    for (let i = 1; i < tables.length; i++) {
        const joinExpr = tables[i];

        str = joinExpr.join ? ' ' + joinExpr.join + (joinExpr.lateral ? ' LATERAL' : '') + ' ' : (str = ', ');

        if (joinExpr.table) {
            if (joinExpr.db !== null) str += joinExpr.db + '.';
            str += identifierToSql(joinExpr.table);
        } else {
            str += exprToSQL(joinExpr.expr);
        }

        if (joinExpr.as !== null) str += ' AS ' + identifierToSql(joinExpr.as);
        if (has(joinExpr, 'columns') && Array.isArray(joinExpr.columns) && joinExpr.columns.length) {
            str += ' (' + joinExpr.columns.map(identifierToSql).join(', ') + ')';
        }
        if (has(joinExpr, 'on') && joinExpr.on !== null) str += ' ON ' + exprToSQL(joinExpr.on);
        if (has(joinExpr, 'using')) str += ' USING (' + joinExpr.using.map(identifierToSql).join(', ') + ')';

        clauses.push(str);
    }

    return clauses.join('');
}

/**
 * @param {Object} withExpr
 */
function withToSql(withExpr) {
    return (
        'WITH ' +
        (withExpr.recursive ? 'RECURSIVE ' : '') +
        withExpr.value
            .map((cte) => {
                const name = `"${cte.name}"`;
                const columns = Array.isArray(cte.columns) ? '(' + cte.columns.join(', ') + ')' : '';

                return name + columns + ' AS (' + exprToSQL(cte.stmt) + ')';
            })
            .join(', ')
    );
}

/**
 * @param {Object}          stmt
 * @param {?Array}          stmt.with
 * @param {?Array}          stmt.options
 * @param {string|null}     stmt.distinct
 * @param {?Array|string}   stmt.columns
 * @param {?Array}          stmt.from
 * @param {?Object}         stmt.where
 * @param {?Array}          stmt.groupby
 * @param {?Object}         stmt.having
 * @param {?Array}          stmt.orderby
 * @param {?Array}          stmt.limit
 * @return {string}
 */
function selectToSQL(stmt) {
    const clauses = ['SELECT'];

    if (has(stmt, 'with') && stmt.with !== null) clauses.unshift(withToSql(stmt.with));
    if (has(stmt, 'options') && Array.isArray(stmt.options)) clauses.push(stmt.options.join(' '));
    if (has(stmt, 'distinct') && stmt.distinct !== null) clauses.push(stmt.distinct);

    clauses.push(stmt.columns !== '*' ? columnsToSQL(stmt.columns) : '*');

    // FROM + joins
    if (Array.isArray(stmt.from)) clauses.push('FROM', tablesToSQL(stmt.from));

    if (has(stmt, 'where') && stmt.where !== null) clauses.push('WHERE ' + exprToSQL(stmt.where));
    if (Array.isArray(stmt.groupby) && stmt.groupby.length > 0)
        clauses.push('GROUP BY', getExprListSQL(stmt.groupby).join(', '));
    if (has(stmt, 'having') && stmt.having !== null) clauses.push('HAVING ' + exprToSQL(stmt.having));

    if (Array.isArray(stmt.orderby) && stmt.orderby.length > 0) {
        const orderExpressions = stmt.orderby.map((expr) => exprToSQL(expr.expr) + ' ' + expr.type);
        clauses.push('ORDER BY', orderExpressions.join(', '));
    }

    if (Array.isArray(stmt.limit)) clauses.push('LIMIT', stmt.limit.map(exprToSQL));

    return clauses.join(' ');
}

function unaryToSQL(expr) {
    const str = expr.operator + ' ' + exprToSQL(expr.expr);
    return !expr.parentheses ? str : '(' + str + ')';
}

function rowValueToSQL(expr) {
    const needsKeyword = expr.keyword === true;
    return (needsKeyword ? 'ROW' : '') + '(' + expr.value.map(exprToSQL) + ')';
}

function valuesToSQL(expr) {
    const str = 'VALUES ' + expr.value.map(exprToSQL).join(', ');
    return `(${str})`;
}

function unionToSQL(stmt) {
    const res = [selectToSQL(stmt)];

    while (stmt._next) {
        res.push('UNION', selectToSQL(stmt._next));
        stmt = stmt._next;
    }

    return res.join(' ');
}

const exprToSQLConvertFn = {
    aggr_func: aggrToSQL,
    binary_expr: binaryToSQL,
    case: caseToSQL,
    cast: castToSQL,
    column_ref: columnRefToSQL,
    expr_list: (expr) => {
        const str = getExprListSQL(expr.value);
        return !expr.parentheses ? str : `(${str})`;
    },
    function: funcToSQL,
    select: (expr) => {
        const str = typeof expr._next !== 'object' ? selectToSQL(expr) : unionToSQL(expr);
        return !expr.parentheses ? str : `(${str})`;
    },
    unary_expr: unaryToSQL,
    values: valuesToSQL,
    row_value: rowValueToSQL
};

function exprToSQL(expr) {
    return exprToSQLConvertFn[expr.type] ? exprToSQLConvertFn[expr.type](expr) : literalToSQL(expr);
}

module.exports = function toSQL(ast) {
    if (ast.type !== 'select') throw new Error('Only SELECT statements supported at the moment');
    return unionToSQL(ast);
};
