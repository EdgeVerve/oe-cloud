/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var async = require('async');

describe(chalk.blue('UIElement'), function () {
  this.timeout(60000);

  var designationModelName = 'Designation';
  var salutationModelName = 'Salutation';
  var testModelName = 'ModelPerson';

  var designationModelDetails = {
    'name': designationModelName,
    'base': 'EnumBase',
    'idInjection': true,
    'options': {
      'validateUpsert': true
    },
    'properties': {},
    'validations': [],
    'relations': {},
    'acls': [],
    'methods': {},
    'enumList': [
      {
        'code': 'DV',
        'description': 'Developer'
      },
      {
        'code': 'MGR',
        'description': 'Manager'
      }
    ]
  };

  var salutationModelDetails = {
    'name': 'Salutation',
    'base': 'RefCodeBase',
    'idInjection': true,
    'options': {
      'validateUpsert': true
    }
  };


  var testModelDetails = {
    'name': testModelName,
    'base': 'BaseEntity',
    'idInjection': true,
    'options': {
      'validateUpsert': true
    },
    'properties': {
      'salutation': {
        'type': 'string',
        'refcodetype': 'Salutation'
      },
      'firstName': {
        'type': 'string',
        'required': true
      },
      'middleName': {
        'type': 'string',
        'required': false
      },
      'lastName': {
        'type': 'string',
        'required': false
      },
      'gender': {
        'type': 'string',
        'required': true,
        'in': ['male', 'female', 'other']
      },
      'language': {
        'type': 'string',
        'required': false
      },
      'birthDate': {
        'type': 'date',
        'required': true
      },
      'captureTime': {
        'type': 'timestamp',
        'required': false
      },
      'annualIncome': {
        'type': 'number',
        'required': false
      },
      'placeOfBirth': {
        'type': 'String',
        'max': 35,
        'required': false
      },
      'profession': {
        'type': 'string',
        'max': 35,
        'required': false
      },
      'nationality': {
        'type': 'string',
        'max': 35,
        'required': false
      },
      'minorIndicator': {
        'type': 'boolean',
        'required': false,
        'default': false
      },
      'qualifications': {
        'type': ['string']
      },
      'languages': {
        'type': ['Literal']
      },
      'designation': {
        'type': 'string',
        'enumtype': 'Designation'
      },
      'email': {
        'type': 'email'
      }
    },
    'validations': [],
    'relations': {
      department: {
        type: 'belongsTo',
        model: 'XDepartment'
      },
      addresses: {
        type: 'embedsMany',
        model: 'XAddress'
      }
    },
    'acls': [],
    'methods': {}
  };

  var addressModel = {
    name: 'XAddress',
    base: 'BaseEntity',
    properties: {
      line1: { type: 'string' },
      line2: { type: 'string' }
    }
  }
  var departmentModel = {
    name: 'XDepartment',
    base: 'BaseEntity',
    properties: {
      name: { type: 'string' }
    }
  }

  var metadataCache = {};

  function createModels(allModels, callback) { }

  function fetchComponent(componentName, callback) {
    bootstrap.models.UIComponent.component(componentName, bootstrap.defaultContext, function (err, data) {
      if (err) return callback(err);

      var start = data.indexOf('<script>');
      var end = data.indexOf('</script>');
      var metaString = data.substr(start + 8, end - start - 8);
      metaString = metaString.replace('window.OEUtils ||', '');
      eval(metaString);

      metadataCache = Object.assign(metadataCache, OEUtils.metadataCache);

      callback(err, data);
    });
  }

  function simulateComponent(component, callback) {
    bootstrap.models.UIComponent.simulate(component, bootstrap.defaultContext, function (err, data) {
      if (err) return callback(err);

      var start = data.indexOf('<script>');
      var end = data.indexOf('</script>');
      var metaString = data.substr(start + 8, end - start - 8);
      var htmlPart = data.substr(end + 9).trim();
      metaString = metaString.replace('window.OEUtils ||', '');
      eval(metaString);
      callback(err, OEUtils.metadataCache[component.name], htmlPart);
    });
  }

  before('setup data', function (done) {
    async.series([
      //      function step0a(next) {
      //        loopback.createModel(salutationModelName, salutationModelDetails.properties, salutationModelDetails);
      //        next();
      //      },
      function step0b(next) {
        loopback.createModel(designationModelName, designationModelDetails.properties, designationModelDetails);
        next();
      },
      function step1(next) {
        bootstrap.models.ModelDefinition.create([salutationModelDetails, departmentModel, addressModel, testModelDetails], bootstrap.defaultContext, next);
      },
      function step1a(next) {
        bootstrap.models.UIElement.create({
          component: 'modelperson-form',
          field: 'firstName',
          attributes: [{
            name: 'minlength',
            value: 2
          }]
        }, bootstrap.defaultContext, function (err, data) {
          next(err);
        });
      },
      function step2(next) {
        fetchComponent('modelperson-form.html', next);
      },
      function step3(next) {
        fetchComponent('modelperson-list.html', next);
      },
      function step4(next) {
        fetchComponent('modelperson-tpl.html', next);
      }
    ], function (err, data) {
      done(err);
    });
  });

  it('fetch using modelmeta method', function (done) {
    var UIComponent = bootstrap.models.UIComponent;
    UIComponent.modelmeta(testModelName, bootstrap.defaultContext, function (err, data) {
      expect(data).to.exist;
      expect(data.componentName).to.equal(testModelName);
      expect(data.modelName).to.equal(testModelName);
      done();
    });
  });

  it('returns error if form-template is not found', function (done) {
    fetchComponent('modelperson-missing', function (err, data) {
      expect(err).to.exist;
      expect(data).to.not.exist;
      expect(err.code).to.equal('TEMPLATE_TYPE_MISSING');
      done();
    });
  });
  it('returns error if form-template is not provided', function (done) {
    fetchComponent('modelperson-', function (err, data) {
      expect(err).to.exist;
      expect(data).to.not.exist;
      expect(err.code).to.equal('TEMPLATE_TYPE_UNDEFINED');
      done();
    });
  });


  it('returns error if model is not found', function (done) {
    fetchComponent('missingmodel-form', function (err, data) {
      expect(err).to.exist;
      expect(data).to.not.exist;
      expect(err.code).to.equal('MODEL_NOT_FOUND');
      done();
    });
  });

  it('loads default form template', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata).to.exist;
    expect(metadata.componentName).to.equal('modelperson-form');
    expect(metadata.modelName).to.equal(testModelName);
    expect(metadata.metadata).to.exist;
    done();
  });

  it('default form cache has model definition', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata.metadata.models).to.be.an('object');
    expect(metadata.metadata.models[testModelName]).to.exist;
    done();
  });

  it('default form cache has properties', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata.metadata.properties).to.be.an('object');
    expect(Object.keys(metadata.metadata.properties)).to.include.members(Object.keys(testModelDetails.properties));
    done();
  });

  xit('default form cache loads element definitions', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata.elements).to.be.an('object');
    expect(metadata.elements.firstName).to.be.an('object').and.have.keys('minlength');
    done();
  });

  it('belongsTo relashionship reflects in properties as typeahead', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata.metadata.properties).to.be.an('object');
    expect(metadata.metadata.properties.departmentId).to.exist;
    expect(metadata.metadata.properties.departmentId.type).to.equal('typeahead');
    expect(metadata.metadata.properties.departmentId.valueproperty).to.exist;
    expect(metadata.metadata.properties.departmentId.displayproperty).to.exist;
    expect(metadata.metadata.properties.departmentId.searchurl).to.exist;
    done();
  });

  it('embedsMany relashionship reflects in properties as grid', function (done) {
    var metadata = metadataCache['modelperson-form'];
    expect(metadata.metadata.properties).to.be.an('object');
    expect(metadata.metadata.properties['xAddress-test-tenants']).to.exist;
    expect(metadata.metadata.properties['xAddress-test-tenants'].type).to.equal('grid');
    done();
  });

  it('default list cache has gridConfig with all required fields as columns', function (done) {
    var metadata = metadataCache['modelperson-list'];
    expect(metadata.gridConfig).to.be.an('object');
    expect(metadata.gridConfig.modelGrid).to.be.an('array').and.include.members(['firstName', 'gender']);
    done();
  });

  it('simulate method returns the component definition', function (done) {
    var component = {
      name: 'salutation-form',
      modelName: 'Salutation'
    };
    simulateComponent(component, function (err, data) {
      expect(data.componentName).to.equal(component.name);
      expect(data.modelName).to.equal(component.modelName);
      expect(data.metadata.properties).to.be.an('object').and.have.keys('code', 'description');
      done();
    });
  });

  it('When template is not defined, content is returned as html', function (done) {
    var component = {
      name: 'salutation-form',
      modelName: 'Salutation',
      content: '<div>Dummy</div>'
    };
    simulateComponent(component, function (err, data, htmlPart) {
      expect(htmlPart).to.equal(component.content);
      done();
    });
  });

  it('When template is defined, content is returned as response.content', function (done) {
    var component = {
      name: 'salutation-form',
      templateName: 'default-form.html',
      modelName: 'Salutation',
      content: '<div>Dummy</div>'
    };
    simulateComponent(component, function (err, data, htmlPart) {
      expect(data.content).to.equal(component.content);
      done();
    });
  });

  it('When filePath is defined, its content are returned as html', function (done) {
    var component = {
      name: 'sample-element',
      filePath: '../client/bower_components/sample-element/sample-element.html'
    };
    simulateComponent(component, function (err, data, htmlPart) {
      expect(htmlPart.indexOf('<dom-module id="sample-element">')).to.equal(0);
      done();
    });
  });

  it('When templateName is defined, its content are returned as html', function (done) {
    var component = {
      name: 'sample-element',
      templateName: '../client/bower_components/sample-element/sample-element.html'
    };
    simulateComponent(component, function (err, data, htmlPart) {
      expect(htmlPart.indexOf('<dom-module id="sample-element">')).to.equal(0);
      done();
    });
  });

  it('importUrls are added as link tags', function (done) {
    var component = {
      name: 'salutation-form',
      templateName: 'default-form.html',
      importUrls: ['link1.html', 'link2.html']
    };
    simulateComponent(component, function (err, data, htmlPart) {
      expect(htmlPart.indexOf('<link rel="import"')).to.equal(0);
      done();
    });
  });


  it('configure creates the UIComponent for form and list templates', function (done) {
    bootstrap.models.UIComponent.configure(['Salutation'], bootstrap.defaultContext, function (err, results) {
      expect(results).to.be.an('array');
      expect(results.length).to.equal(2);
      done(err);
    });
  });



});
