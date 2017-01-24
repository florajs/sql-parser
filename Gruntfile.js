'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        eslint: {
            target: ['lib/**/*.js']
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    quiet: false
                },
                src: ['test/**/*.js']
            },
            bamboo: {
                options: {
                    reporter: 'mocha-bamboo-reporter',
                    quiet: false
                },
                src: ['<%= mochaTest.test.src %>']
            }
        },

        'mocha_istanbul': {
            coverage: {
                src: 'test',
                options: {
                    excludes: ['pegjs-parser.js'],
                    coverageFolder: 'build',
                    reportFormats: ['clover', 'lcov']
                }
            }
        },

        exec: {
            createParser: {
                cmd: './node_modules/.bin/pegjs -o pegjs-parser.js sql.pegjs'
            }
        },
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['lint', 'test']);
    grunt.registerTask('test', ['create-parser', 'mochaTest:test']);
    grunt.registerTask('test-bamboo', ['create-parser', 'mochaTest:bamboo']);
    grunt.registerTask('test-cov', ['create-parser', 'mocha_istanbul:coverage']);
    grunt.registerTask('lint', ['eslint']);
    grunt.registerTask('create-parser', 'exec:createParser');
};
