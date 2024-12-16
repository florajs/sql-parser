const js = require('@eslint/js');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            sourceType: 'commonjs',
            parserOptions: {
                ecmaVersion: 2018
            }
        }
    },
    {
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'off',
            'require-atomic-updates': 'off',
            'no-prototype-builtins': 'off'
        }
    },
    {
        files: ['index.js', 'lib/*.js', 'test/**/*.spec.js']
    },
    {
        ignores: ['node_modules/', 'build/']
    }
];
