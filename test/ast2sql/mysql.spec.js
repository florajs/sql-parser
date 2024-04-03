'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getParsedSql } = require('./util');

describe('MySQL', () => {
    it('should support query options', () => {
        assert.equal(
            getParsedSql('SELECT SQL_CALC_FOUND_ROWS SQL_BUFFER_RESULT col1 FROM t'),
            'SELECT SQL_CALC_FOUND_ROWS SQL_BUFFER_RESULT "col1" FROM "t"'
        );
    });
});
