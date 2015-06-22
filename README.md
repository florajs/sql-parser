Flora SQL parser
================

Parse simple SQL statements into an abstract syntax tree (AST) and convert it back to SQL.

Create AST for SQL statement:
```javascript
var Parser = require('flora-sql-parser').Parser;
var parser = new Parser();
var ast = parser.parse('SELECT * FROM t');

console.log(ast);
```

Convert AST back to SQL:
```javascript
var Parser = require('flora-sql-parser').Parser;
var ast = (new Parser()).parse('SELECT * FROM t');
var toSQL = require('flora-sql-parser').util.astToSQL;

console.log(toSQL(ast));
```
