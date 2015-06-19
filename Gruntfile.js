'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        eslint: {
            target: ['lib/**/*.js', 'parser/**/*.js']
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

        exec: {
            createParser: {
                cmd: './node_modules/.bin/pegjs parser/sql.pegjs pegjs-parser.js'
            }
        },

        newer: { // only re-create parser if grammar file has changed
            grammarFile: {
                src: 'parser/sql.pegjs',
                dest: 'pegjs-parser.js',
                options: {
                    tasks: ['exec:createParser']
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['lint', 'test']);
    grunt.registerTask('test', ['create-parser', 'mochaTest:test']);
    grunt.registerTask('lint', ['eslint']);
    grunt.registerTask('create-parser', 'newer');
};
