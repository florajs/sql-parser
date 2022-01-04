# @florajs/sql-parser

![](https://github.com/florajs/sql-parser/workflows/ci/badge.svg)
[![NPM version](https://img.shields.io/npm/v/@florajs/sql-parser.svg?style=flat)](https://www.npmjs.com/package/@florajs/sql-parser)
[![NPM downloads](https://img.shields.io/npm/dm/@florajs/sql-parser.svg?style=flat)](https://www.npmjs.com/package/@florajs/sql-parser)

Parse simple SQL statements into an abstract syntax tree (AST) and convert it back to SQL.

## Usage

### Create AST for SQL statement

```javascript
const { Parser } = require('@florajs/sql-parser');
const parser = new Parser();
const ast = parser.parse('SELECT * FROM t');

console.log(ast);
```

### Convert AST back to SQL

```javascript
const { Parser } = require('@florajs/sql-parser');
const ast = (new Parser()).parse('SELECT * FROM t');
const toSQL = require('@florajs/sql-parser').util.astToSQL;

console.log(toSQL(ast));
```

The generated SQL is ANSI SQL compliant. To run those queries on MySQL, make sure you set correct SQL mode

```sql
SET SESSION sql_mode = 'ANSI';
```

before running any query.

## Acknowledgement

This project is based on the SQL parser extracted from Alibaba's [nquery](https://github.com/alibaba/nquery) module.  

## License

[GPL-2.0](LICENSE)
