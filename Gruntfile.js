/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      coverage: {
        src: ['coverage/']
      },
      dist: {
        src: ['dist/']
      }
    },

    mocha_istanbul: {
      options: {
        mochaOptions: ['--exit']
      },
      coverage: {
        src: ['test/test.js', 'test/aggregation-fn-groupby-test.js', 'test/aggregation-fn-having-test.js'],
        options: {
          timeout: 60000,
          check: {
            lines: 75,
            statements: 75,
            branches: 60,
            functions: 80
          },
          reportFormats: ['lcov']
        }
      }
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
};
