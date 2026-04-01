const js = require('@eslint/js');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
    {
        files: ['index.js', 'lib/*.js', 'test/**/*.spec.js', 'eslint.config.js']
    },
    {
        ignores: ['node_modules/', 'dist/']
    },
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            sourceType: 'commonjs',
            ecmaVersion: 2018
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'off',
            'require-atomic-updates': 'off',
            'no-prototype-builtins': 'off'
        }
    }
];
