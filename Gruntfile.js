/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    mkdir: {
      all: {
        options: {
          create: ['dist']
        }
      }
    },

    copy: {
      main: {
        files: [
          // includes files within path and its sub-directories
          {
            expand: true,
            src: ['**', '!node_modules/**', '!coverage/**'],
            dest: 'dist/'
          }
        ]
      }
    },

    usebanner: {
      all: {
        options: {
          position: 'top',
          banner: '/*\n' +
          '©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.\n' +
          'The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries. \n' +
          'The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.\n' +
          'Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.\n' +
          '*/',
          linebreak: true
        },
        files: {
          src: ['**/*.js']
        }
      }
    },

    mochaTest: {
      test: {
        options: {
          quiet: false,
          clearRequireCache: true,
          timeout: 100000
        },
        src: ['test/*.js']
      },
      integrationTest: {
        options: {
          quiet: false,
          clearRequireCache: true,
          timeout: 100000
        },
        src: ['test/integration-test/*.js']
      },
      postgres: {
        options: {
          quiet: false,
          clearRequireCache: true,
          timeout: 100000
        },
        src: ['test/audit-field-mixin-test.js', 'test/auto-fields-test.js', 'test/basic-api-test.js', 'test/basic-test.js', 'test/bootstrap.js', 'test/business-rule-mixin-test.js', 'test/caching-test.js', 'test/composite-model-test.js', 'test/concurrency-test.js', 'test/config-merge-test.js', 'test/cr-model-test.js', 'test/crypto-test.js', 'test/data-acl-test.js', 'test/data-hierarchy-test.js', 'test/data-personalization-test.js', 'test/datasource-personalization.js', 'test/decision-table-test.js', 'test/delete-test.js', 'test/designer-boot-test.js', 'test/embedded-many-test.js', 'test/enum-test.js', 'test/failsafe-observer-test.js', 'test/fail-test.js', 'test/gridconfig-test.js', 'test/gridmetadata-test.js', 'test/health-test.js', 'test/history-mixin-test.js', 'test/idempotent-behavior-test.js', 'test/idempotent-mixin-test.js', 'test/import-export-test.js', 'test/integration-test.js', 'test/job-scheduler-test.js', 'test/literal-test.js', 'test/misclaneous-test.js', 'test/model-collection-test.js', 'test/model-definition-ACL-test.js', 'test/model-definition-inheritance-test.js', 'test/model-definition-relation-test.js', 'test/model-definition-test.js', 'test/model-definition-test2.js', 'test/model-definition-validation-test.js', 'test/model-personalization-test.js', 'test/model-transaction-test.js', 'test/model-validation-composite-uniqueness-test.js', 'test/model-validation-embeddedModel-test.js', 'test/model-validation-evValidation-custom-test.js', 'test/model-validation-evValidation-test.js', 'test/model-validation-relation-test.js', 'test/model-validation-test.js', 'test/model-validation-validateWhen.js', 'test/model-validation-xmodelvalidate-test.js', 'test/model-variant-of-test.js', 'test/multi-tenancy-test.js', 'test/node-red-test.js', 'test/otp-mixin-test.js', 'test/property-expressions-test.js', 'test/relation-has-one-test.js', 'test/service-personalization-relation-test.js', 'test/service-personalization-test.js', 'test/soft-delete-mixin-test.js', 'test/switch-data-source-test.js', 'test/uicomponent-test.js', 'test/uimetadata-test.js', 'test/unauthorised-write.js', 'test/update-data-acl-test.js', 'test/version-mixin-test.js', 'test/z-jwt-assertion-test.js', 'test/z-remove-demo-user-test.js', 'test/z-z-ap-state-test.js', 'test/z-z-business-validations-tests.js', 'test/z-z-rest-api-actors-mixin-tests.js', 'test/z-z-z-actor-pattern-test.js', 'test/z-z-z-actor-pattern-db-lock-test.js', 'test/z-z-journal-retry-tests.js', 'test/z-z-z-logger-config-test.js', 'test/z-z-z-z-mark-as-cache-able-test.js', 'test/instance-caching-test.js']
      },
      oracle: {
        options: {
          quiet: false,
          clearRequireCache: true,
          timeout: 100000
        },
        src: ['test/audit-field-mixin-test.js', 'test/auto-fields-test.js', 'test/basic-api-test.js', 'test/basic-crud.js', 'test/basic-test.js', 'test/bootstrap.js', 'test/business-rule-mixin-test.js', 'test/composite-model-test.js', 'test/concurrency-test.js', 'test/config-merge-test.js', 'test/cr-model-test.js', 'test/data-hierarchy-test.js', 'test/instance-caching-test.js']
      }
    },

    clean: {
      coverage: {
        src: ['coverage/']
      },
      dist: {
        src: ['dist/']
      }
    },

    mocha_istanbul: {
      coverage: {
        src: 'test',
        options: {
          excludes: ['lib/expression-language/expression-syntax-parser.js', 'lib/ev-tenant-util.js', 'common/models/framework/cache-manager.js', 'lib/common/broadcaster-client.js', 'server/boot/uws-boot.js', 'lib/uws-client.js', 'lib/proxy-context.js', 'common/models/framework/base-user-identity.js'],
          timeout: 60000,
          check: {
            lines: 78,
            statements: 78,
            branches: 65,
            functions: 84
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
  grunt.loadNpmTasks('grunt-banner');

  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
  grunt.registerTask('addbanner', ['clean:dist', 'mkdir', 'copy', 'usebanner']);
};
