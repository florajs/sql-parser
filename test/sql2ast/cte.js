'use strict';

const { expect } = require('chai');
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

        expect(ast).to.have.property('with').and.to.be.an('object');

        const cte = ast.with;
        expect(cte).to.have.property('type', 'with');
        expect(cte).to.have.property('value').and.to.be.an('array').and.to.have.lengthOf(1);

        const [withListElement] = cte.value;
        expect(withListElement).to.have.property('name', 'cte');
        expect(withListElement).to.have.property('columns', null);
        expect(withListElement).to.have.property('stmt').and.to.be.an('object').and.to.have.property('type', 'select');
    });

    it('should parse multiple CTEs', () => {
        const ast = parser.parse(
            `
            WITH cte1 AS (SELECT 1), cte2 AS (SELECT 2)
            SELECT * FROM cte1 UNION SELECT * FROM cte2
        `.trim()
        );

        expect(ast.with).to.have.property('value').and.to.have.lengthOf(2);

        const [cte1, cte2] = ast.with.value;
        expect(cte1).to.have.property('name', 'cte1');
        expect(cte2).to.have.property('name', 'cte2');
    });

    it('should parse CTE with column', () => {
        const ast = parser.parse(
            `
            WITH cte (col1) AS (SELECT 1)
            SELECT * FROM cte
        `.trim()
        );

        const [cte] = ast.with.value;
        expect(cte).to.have.property('columns').and.to.eql(['col1']);
    });

    it('should parse CTE with multiple columns', () => {
        const ast = parser.parse(
            `
            WITH cte (col1, col2) AS (SELECT 1, 2)
            SELECT * FROM cte
        `.trim()
        );

        const [cte] = ast.with.value;
        expect(cte.columns).to.eql(['col1', 'col2']);
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

        expect(ast.with).to.have.property('recursive', true);
    });
});
