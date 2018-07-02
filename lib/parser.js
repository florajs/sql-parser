'use strict';

const parseFn = require('./../build/pegjs-parser').parse;

class Parser {
    parse(sql) {
        return parseFn(sql);
    }
}

module.exports = Parser;
