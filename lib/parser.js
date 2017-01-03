'use strict';

const parseFn = require('./../pegjs-parser').parse;

class Parser {
    parse(sql) {
        return parseFn(sql);
    }
}

module.exports = Parser;
