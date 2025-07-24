'use strict';

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
        .map((char) => (!Object.hasOwn(escapeMap, char) ? char : escapeMap[char]))
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

function dataTypeToSQL(type) {
    const { dataType } = type;
    if (type.length > 0) return `${dataType}(${type.length})`;
    if (type.precision && type.scale) return `${dataType}(${type.precision}, ${type.scale})`;
    if (type.precision) return `${dataType}(${type.precision})`;
    return dataType;
}

function castToSQL(expr) {
    return 'CAST(' + exprToSQL(expr.expr) + ' AS ' + dataTypeToSQL(expr.target) + ')';
}

function columnRefToSQL(expr) {
    let str = expr.column !== '*' ? identifierToSql(expr.column) : '*';
    if (Object.hasOwn(expr, 'table') && expr.table !== null) str = identifierToSql(expr.table) + '.' + str;
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
    return tables
        .map((node, index) => {
            if (node.join) return joinToSQL(node);
            if (node.table) return tableToSQL(node, index);
            if (node.expr) return tableExprToSQL(node);
            if (node.type === 'dual') return 'DUAL';

            throw new Error('Failed to convert node to SQL', { cause: { node } });
        })
        .join('');
}

function tableToSQL(node, index) {
    let str = index > 0 ? ', ' : '';

    str += node.db ? `${node.db}.` : '';
    str += identifierToSql(node.table);
    if (node.as) str += ' AS ' + identifierToSql(node.as);

    return str;
}

function joinToSQL(node) {
    let str = node.join ? ' ' + node.join + (node.lateral ? ' LATERAL' : '') + ' ' : ', ';

    if (node.table) {
        if (node.db !== null) str += node.db + '.';
        str += identifierToSql(node.table);
    } else str += exprToSQL(node.expr);

    if (node.as !== null) str += ' AS ' + identifierToSql(node.as);

    if (Array.isArray(node.columns) && node.columns.length) {
        str += ' (' + node.columns.map(identifierToSql).join(', ') + ')';
    }

    if (node.on) str += ' ON ' + exprToSQL(node.on);
    if (node.using) str += ' USING (' + node.using.map(identifierToSql).join(', ') + ')';

    return str;
}

function tableExprToSQL(node) {
    const { expr, columns } = node;
    let str = expr.type === 'select' ? `(${toSQL(expr)})` : exprToSQL(expr);

    if (node.as) str += ' AS ' + identifierToSql(node.as);
    if (Array.isArray(columns) && columns.length) {
        str += ' (' + columns.map(identifierToSql).join(', ') + ')';
    }

    return str;
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

    if (Object.hasOwn(stmt, 'with') && stmt.with !== null) clauses.unshift(withToSql(stmt.with));
    if (Object.hasOwn(stmt, 'options') && Array.isArray(stmt.options)) clauses.push(stmt.options.join(' '));
    if (Object.hasOwn(stmt, 'distinct') && stmt.distinct !== null) clauses.push(stmt.distinct);

    clauses.push(stmt.columns !== '*' ? columnsToSQL(stmt.columns) : '*');

    // FROM + joins
    if (Array.isArray(stmt.from)) clauses.push('FROM', tablesToSQL(stmt.from));

    if (Object.hasOwn(stmt, 'where') && stmt.where !== null) clauses.push('WHERE ' + exprToSQL(stmt.where));
    if (Array.isArray(stmt.groupby) && stmt.groupby.length > 0)
        clauses.push('GROUP BY', getExprListSQL(stmt.groupby).join(', '));
    if (Object.hasOwn(stmt, 'having') && stmt.having !== null) clauses.push('HAVING ' + exprToSQL(stmt.having));

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

function toSQL(ast) {
    if (ast.type !== 'select') throw new Error('Only SELECT statements supported at the moment');
    return unionToSQL(ast);
}

module.exports = toSQL;
