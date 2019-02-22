# Flora SQL Parser

[![Build Status](https://travis-ci.org/godmodelabs/flora-sql-parser.svg?branch=master)](https://travis-ci.org/godmodelabs/flora-sql-parser)
[![NPM version](https://badge.fury.io/js/flora-sql-parser.svg)](https://www.npmjs.com/package/flora-sql-parser)
[![Dependencies](https://img.shields.io/david/godmodelabs/flora-sql-parser.svg)](https://david-dm.org/godmodelabs/flora-sql-parser)

Parse simple SQL statements into an abstract syntax tree (AST) and convert it back to SQL.

## Usage

### Create AST for SQL statement

```javascript
const { Parser } = require('flora-sql-parser');
const parser = new Parser();
const ast = parser.parse('SELECT * FROM t');

console.log(ast);
```

### Convert AST back to SQL

```javascript
const { Parser } = require('flora-sql-parser');
const ast = (new Parser()).parse('SELECT * FROM t');
const toSQL = require('flora-sql-parser').util.astToSQL;

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
