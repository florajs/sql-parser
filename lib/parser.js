'use strict';

var parseFn = require('./../pegjs-parser').parse;

function Parser() {}

Parser.prototype.parse = function (sql) {
    return parseFn(sql).ast;
};

module.exports = Parser;
