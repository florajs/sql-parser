'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('MySQL', () => {
    it('should support query options', () => {
        expect(getParsedSql('SELECT SQL_CALC_FOUND_ROWS SQL_BUFFER_RESULT col1 FROM t')).to.equal(
            'SELECT SQL_CALC_FOUND_ROWS SQL_BUFFER_RESULT "col1" FROM "t"'
        );
    });
});
