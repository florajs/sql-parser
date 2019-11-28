'use strict';

const { Parser, util } = require('../../');
const parser = new Parser();

module.exports = {
    getParsedSql: function (sql) {
        const ast = parser.parse(sql);
        return util.astToSQL(ast);
    }
};
