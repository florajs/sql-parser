'use strict';

const { expect } = require('chai');
const { getParsedSql } = require('./util');

describe('common table expressions', () => {
    it('should support single CTE', () => {
        const sql = `
            WITH cte AS (SELECT 1)
            SELECT * FROM cte
        `.trim();

        expect(getParsedSql(sql)).to.equal('WITH "cte" AS (SELECT 1) SELECT * FROM "cte"');
    });

    it('should support multiple CTE', () => {
        const expected =
            'WITH "cte1" AS (SELECT 1), "cte2" AS (SELECT 2) ' + 'SELECT * FROM "cte1" UNION SELECT * FROM "cte2"';
        const sql = `
            WITH cte1 AS (SELECT 1), cte2 AS (SELECT 2)
            SELECT * FROM cte1 UNION SELECT * FROM cte2
        `.trim();

        expect(getParsedSql(sql)).to.equal(expected);
    });

    it('should support CTE with column', () => {
        const sql = `
            WITH cte (col1) AS (SELECT 1)
            SELECT * FROM cte
        `.trim();

        expect(getParsedSql(sql)).to.contain('(col1)');
    });

    it('should support CTE with multiple columns', () => {
        const sql = `
            WITH cte (col1, col2) AS (SELECT 1, 2)
            SELECT * FROM cte
        `.trim();

        expect(getParsedSql(sql)).to.contain('(col1, col2)');
    });

    it('should support recursive CTE', () => {
        const sql = `
            WITH RECURSIVE cte(n) AS
            (
                SELECT 1
                UNION
                SELECT n + 1 FROM cte WHERE n < 5
            )
            SELECT * FROM cte
        `.trim();

        expect(getParsedSql(sql)).to.match(/^WITH RECURSIVE/);
    });
});
