# Changelog

## [4.0.0]
### Breaking Changes
- Replaced PEG.js by Peggy
- Removed support for Node.js 18
- `DECIMAL` is parsed in a structured way now:

  `DECIMAL(10)`
  ```json
  {
    "dataType": "DECIMAL",
    "precision": 10
  }
  ```
  `DECIMAL(10, 2)`
  ```json
  {
    "dataType": "DECIMAL",
    "precision": 10,
    "scale": 2
  }
  ```
### Added
- Support for JSON_TABLE (new keywords `COLUMNS`, `JSON_TABLE` and `PATH`)
