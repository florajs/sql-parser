'use strict';

const parseFn = require('./../dist/parser').parse;

class Parser {
    parse(sql) {
        return parseFn(sql);
    }
}

module.exports = Parser;
