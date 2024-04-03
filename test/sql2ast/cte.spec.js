'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Parser } = require('../../');

describe('common table expressions', () => {
    const parser = new Parser();

    it('should parse single CTE', () => {
        const ast = parser.parse(
            `
            WITH cte AS (SELECT 1)
            SELECT * FROM cte
        `.trim()
        );

        assert.ok(typeof ast.with === 'object');

        const { with: cte } = ast;
        assert.ok(Object.hasOwn(cte, 'type'));
        assert.equal(cte.type, 'with');

        assert.ok(Object.hasOwn(cte, 'value'));
        assert.ok(Array.isArray(cte.value));
        assert.equal(cte.value.length, 1);

        const [withListElement] = cte.value;
        assert.ok(Object.hasOwn(withListElement, 'name'));
        assert.equal(withListElement.name, 'cte');
        assert.ok(Object.hasOwn(withListElement, 'columns'));
        assert.equal(withListElement.columns, null);
        assert.ok(Object.hasOwn(withListElement, 'stmt'));
        assert.ok(typeof withListElement.stmt === 'object');
        assert.ok(Object.hasOwn(withListElement.stmt, 'type'));
        assert.equal(withListElement.stmt.type, 'select');
    });

    it('should parse multiple CTEs', () => {
        const ast = parser.parse(
            `
            WITH cte1 AS (SELECT 1), cte2 AS (SELECT 2)
            SELECT * FROM cte1 UNION SELECT * FROM cte2
        `.trim()
        );

        assert.ok(Object.hasOwn(ast.with, 'value'));
        assert.ok(Array.isArray(ast.with.value));
        assert.equal(ast.with.value.length, 2);

        const [cte1, cte2] = ast.with.value;
        assert.ok(Object.hasOwn(cte1, 'name'));
        assert.equal(cte1.name, 'cte1');
        assert.ok(Object.hasOwn(cte2, 'name'));
        assert.equal(cte2.name, 'cte2');
    });

    it('should parse CTE with column', () => {
        const ast = parser.parse(
            `
            WITH cte (col1) AS (SELECT 1)
            SELECT * FROM cte
        `.trim()
        );

        const [cte] = ast.with.value;
        assert.ok(Object.hasOwn(cte, 'columns'));
        assert.deepEqual(cte.columns, ['col1']);
    });

    it('should parse CTE with multiple columns', () => {
        const ast = parser.parse(
            `
            WITH cte (col1, col2) AS (SELECT 1, 2)
            SELECT * FROM cte
        `.trim()
        );

        const [cte] = ast.with.value;
        assert.deepEqual(cte.columns, ['col1', 'col2']);
    });

    it('should parse recursive CTE', () => {
        const ast = parser.parse(
            `
            WITH RECURSIVE cte(n) AS
            (
                SELECT 1
                UNION
                SELECT n + 1 FROM cte WHERE n < 5
            )
            SELECT * FROM cte
        `.trim()
        );

        assert.ok(Object.hasOwn(ast.with, 'recursive'));
        assert.equal(ast.with.recursive, true);
    });
});
