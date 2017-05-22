/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;

var models = bootstrap.models;
//var app = bootstrap.app;
//var metadataUrl = bootstrap.basePath + '/ModelDefinitions';

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;
//var uuid = require('node-uuid');

//var debug = require('debug')('model-definition-test');
var async = require('async');

var loopback = require('loopback');

function create(model, items, callback) {
    async.forEachOf(items,
        function (item, m, callback2) {
            model.create(item, bootstrap.defaultContext, function (a, b) {
                callback2();
            });
        },
        function (err) {
            if (err) {
                throw err;
            }
            callback();
        });
}

function deleteAndCreate(model, items, callback) {
    model.destroyAll({}, bootstrap.defaultContext, function () {
        async.forEachOf(items,
            function (item, m, callback2) {
                model.create(item, bootstrap.defaultContext, function (e, rec) {
                    if (e) {
                        console.error(e.message);
                    }
                    callback2();
                });
            },
            function (err) {
                if (err) {
                    throw err;
                }
                callback();
            });
    });
}


// function findInAllContainers(containers, controlId) {
// for (var cName in containers) {
// if (containers.hasOwnProperty(cName)) {
// var container = containers[cName];
// var meta = findInControls(container, controlId);

// if (meta) { return meta; }
// }
// }
// }


function findInControls(controls, controlId) {

    for (var i = 0; i < controls.length; i++) {
        var meta = controls[i];

        if (meta.name === controlId) {
            return meta;
        }
    }
    return undefined;
}

function findInColumnData(columnData, field) {

    for (var i = 0; i < columnData.length; i++) {
        var col = columnData[i];

        if (col.field === field) {
            return col;
        }
    }
    return undefined;
}

describe(chalk.blue('ui-metadata'), function () {
    //var loopbackContext;
    //var tenantId = 'test-tenant';
    //var dsname = 'test_ds';
    //var dataSource;
    //var tenantId_id;
    //var requestId;
    this.timeout(50000);


    var projectDef = {
        name: 'TestProject',
        plural: 'TestProjects',
        base: 'BaseEntity',
        properties: {
            'projName': {
                'type': 'string',
                'required': true
            }
        }
    };

    var taskDef = {
        name: 'TestTask',
        plural: 'TestTasks',
        base: 'BaseEntity',
        filebased: false,
        properties: {
            'taskName': {
                'type': 'string',
                'required': true
            },
            'efforts': {
                'type': 'number'
            },
            'startDate': {
                'type': 'date',
                'required': true
            }
        }
    };

    var addressDef = {
        name: 'TestAddress',
        plural: 'TestAddresses',
        base: 'BaseEntity',
        filebased: false,
        properties: {
            'line1': {
                'type': 'string',
                'required': true
            },
            'city': {
                'type': 'string'
            },
            'isCurrent': {
                'type': 'boolean'
            },
            'stayingSince': {
                'type': 'date'
            }
        }
    };

    var academicsDef = {
        name: 'TestAcademics',
        plural: 'TestAcademics',
        base: 'BaseEntity',
        filebased: false,
        properties: {
            'graduation': {
                'type': 'boolean',
                'default': true
            },
            'matriculation': {
                'type': 'boolean',
                'default': true
            },
            'postGraduation': {
                'type': 'boolean',
                'default': false
            },
            '_submittedOn': {
                'type': 'date'
            },
            marks:{
                type: 'string',
                in:['cgpa','percentage','grade']
            }
        }
    };

    var modelName = 'TestEmployee';
    var modelDef = {
        name: modelName,
        plural: modelName,
        base: 'BaseEntity',
        properties: {
            'empName': {
                'type': 'string',
                'required': true
            },
            'empId': {
                'type': 'string',
                'required': true
            },
            'joiningDate': {
                'type': 'date',
                'required': true
            },
            'salary': {
                'type': 'number',
                'required': true,
                'default': 100000
            },
            'priorExp': {
                'type': 'number',
                'required': true,
                'min': 1,
                'max': 50
            },
            'comments': {
                'type': 'string',
                'required': true,
                'min': 20,
                'max': 120
            },
            'bandApplicable': {
                'type': 'boolean',
                'default': true
            },
            'academics': {
                'type': 'TestAcademics'
            },
            'skills': {
                'type': ['string']
            },
            'rankings': {
                'type': ['number']
            },
            'revisionDates': {
                'type': ['date']
            },
            'addresses': {
                'type': ['TestAddress']
            },
            '_generatedOn': {
                'type': 'date'
            }
        },
        filebased: false,
        'relations': {
            'project': {
                'type': 'belongsTo',
                'model': 'TestProject',
                'foreignKey': ''
            },
            'tasks': {
                'type': 'hasMany',
                'model': 'TestTask',
                'foreignKey': ''
            }
        }
    };

    var fields = [
        {
            key: 'empName',
            uitype: 'text',
            label: 'Employee Name',
            maxlength: 40,
            minlength: 6
    },
        {
            key: 'empId',
            uitype: 'text',
            label: 'Employee ID',
            maxlength: 8,
            minlength: 8
    },
        {
            key: 'empId10',
            uitype: 'text',
            label: 'Employee ID 10',
            maxlength: 10,
            minlength: 10,
            default: 'XXXXXXXX'
    },
        {
            key: 'joiningDate',
            uitype: 'date',
            label: 'Joining Date'
    },
        {
            key: 'joiningDateAsText',
            uitype: 'text',
            label: 'Joining Date'
    }
  ];

    var testmetadata = {
        code: 'testmetadata',
        description: 'TestEmployee form',
        modeltype: 'TestEmployee',
        controls: [
            {
                source: 'joiningDateAsText',
                fieldid: 'joiningDate',
                container: 'others'
      },
            {
                fieldid: 'joiningDate',
                source: 'joiningDateAsText',
                label: 'Overriden Joining Date',
                container: 'others'
      },
      'empName',
            {
                source: 'missingMeta',
                fieldid: 'empName',
                maxlength: 90,
                container: 'main'
      }, {
                source: 'empId10',
                fieldid: 'empId',
                container: 'main'

      }, {
                fieldid: 'empId',
                source: 'empId10',
                label: 'Overriden Employee ID Label',
                container: 'main'

      },
      'joiningDate'
    ],
        exclude: ['salary'],
        resturl: '/api/TestEmployee'
    };

    var nomodeltype = {
        code: 'nomodeltype',
        description: 'form nomodeltype',
        controls: ['empName', 'joiningDate'],
        resturl: '/api/TestEmployee'
    };

    var noinjection = {
        code: 'noinjection',
        description: 'form noinjection',
        modeltype: 'TestEmployee',
        skipMissingProperties: true,
        controls: ['empName', 'joiningDate', 'salary'],
        resturl: '/api/TestEmployee'
    };

    var frequencyEnumModel = {
        name: 'TestFrequencyEnum',
        base: 'EnumBase',
        enumList: [
            {
                code: 'M',
                description: 'Monthly'
            },
            {
                code: 'A',
                description: 'Annual'
            }
        ]
    };

    var loanDetailModel = {
        name: 'TestLoanDetails',
        base: 'BaseEntity',
        properties: {
            interestFrequency: {
                type: 'string',
                enumtype: 'TestFrequencyEnum'
            },
            'jobLevel': {
                'type': 'number',
                'numericality':'integer'
            }
        }
    };

    before('Define model and load data', function (done) {
        loopback.createModel(frequencyEnumModel);

        create(models.ModelDefinition, [projectDef, taskDef, addressDef, academicsDef, modelDef, loanDetailModel], function (err) {
            if (err) {
                done(err);
            } else {
                deleteAndCreate(models.UIMetadata, [testmetadata, nomodeltype, noinjection], function (err1) {
                    if (err1) {
                        done(err1);
                    } else {
                        deleteAndCreate(models.Field, fields, function (err2) {
                            done(err2);
                        });
                    }
                });
            }
        });
    });

    after('destroy model', function (done) {
        models['TestEmployee'].destroyAll({}, bootstrap.defaultContext, function (err) {
            if (err) {
                console.error(err);
            }

            models['TestProject'].destroyAll({}, bootstrap.defaultContext, function (err) {

                models['UIMetadata'].destroyAll({}, bootstrap.defaultContext, function (err) {

                    models.ModelDefinition.destroyAll({
                        name: {
                            inq: ['TestEmployee', 'TestProject', 'TestAddress', 'TestTask']
                        }
                    }, bootstrap.defaultContext, function (err) {
                        if (err) {
                            console.error(err);
                        }
                        done(err);
                    });
                });
            });
        });
    });

    it('should return UIMetadata with appropriate model defaults', function (done) {

        api
            .get(bootstrap.basePath + '/UIMetadata/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                //debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    expect(res.body.controls).to.exist;
                    expect(res.body.controls).to.be.an('array');

                    for (var propName in modelDef.properties) {
                        if (modelDef.properties.hasOwnProperty(propName)) {

                            //don't expect embedded object to be here.
                            if (propName === 'academics' || propName[0] === '_') {
                                continue;
                            }

                            var control_id = 'others_' + propName;

                            var fieldMeta = findInControls(res.body.controls, control_id);

                            expect(fieldMeta).to.exist;
                            expect(fieldMeta.fieldid).to.equal(propName);
                            expect(fieldMeta.uitype).to.exist;
                            expect(fieldMeta.label).to.exist;
                        }
                    }

                    done();
                }
            });
    });

    it('should render number with numericality=integer as integer', function(done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/' + loanDetailModel.name + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function(err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    var jobLevelCtrl = res.body.controls.filter(function(i){
                        return i.fieldid === 'jobLevel';
                    });

                    expect(jobLevelCtrl).to.be.not.empty;
                    expect(jobLevelCtrl[0].fieldid).to.equal('jobLevel');
                    expect(jobLevelCtrl[0].uitype).to.equal('integer');

                    //expect(res.body.controls[0].listdata.length).to.be.equal(2);
                    done();
                }
            });
    });

    it('should render enum as combo', function(done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/' + loanDetailModel.name + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function(err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body.controls[0].listdata.length).to.be.equal(2);
                    done();
                }
            });
    });

    it('should render "in" validation as combo', function(done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function(err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body.controls).to.exist;
                    var marksCtrl = findInControls(res.body.controls, 'others_academics_marks');
                    expect(marksCtrl).to.exist;
                    expect(marksCtrl.listdata).to.exist;
                    expect(marksCtrl.listdata).to.deep.equal(academicsDef.properties.marks.in);
                    done();
                }
            });
    });
    
    it('should add sub-properties of embedded model', function (done) {

        api
            .get(bootstrap.basePath + '/UIMetadata/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                //debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    expect(res.body.controls).to.exist;
                    expect(res.body.controls).to.be.an('array');

                    for (var propName in academicsDef.properties) {
                        if (academicsDef.properties.hasOwnProperty(propName)) {
                            if (propName[0] === '_') {
                                continue;
                            }

                            var control_id = 'others_academics_' + propName;

                            var fieldMeta = findInControls(res.body.controls, control_id);

                            expect(fieldMeta).to.exist;
                            expect(fieldMeta.fieldid).to.equal('academics.' + propName);
                            expect(fieldMeta.uitype).to.exist;
                            expect(fieldMeta.label).to.exist;
                        }
                    }

                    done();
                }
            });
    });

    it('should NOT add _(system/hidden) and scope property from model', function (done) {

        api
            .get(bootstrap.basePath + '/UIMetadata/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                //debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.controls).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others__generatedOn');
                    expect(fieldMeta).to.not.exist;
                    var scope = findInControls(res.body.controls, 'others_scope');
                    expect(scope).to.not.exist;
                    done();
                }
            });
    });

    it('should NOT add _(system/hidden) and scope property from sub-model', function (done) {

        api
            .get(bootstrap.basePath + '/UIMetadata/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                //debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.controls).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_academics__submittedOn');
                    expect(fieldMeta).to.not.exist;
                    var scope = findInControls(res.body.controls, 'others_academics_scope');
                    expect(scope).to.not.exist;
                    done();
                }
            });
    });


    it('should use \'string\' for (1) binding as well as (2) meta definition lookup, when defined as string', function (done) {

        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    //debug('response body : ' + JSON.stringify(res.body, null, 4));

                    expect(res.body).to.exist;
                    expect(res.body.code).to.equal('testmetadata');
                    expect(res.body.modeltype).to.equal(modelName);

                    var fieldMeta = findInControls(res.body.controls, 'others_empName_2');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.fieldid).to.equal('empName');
                    expect(fieldMeta.label).to.equal('Employee Name');
                    expect(fieldMeta.uitype).to.equal('text');
                    expect(fieldMeta.maxlength).to.equal(40);
                    expect(fieldMeta.minlength).to.equal(6);

                    done();
                }
            });
    });

    it('should use \'field\' for binding and \'source\' for meta definition lookup' +
        'when control is defined as {source: \'...\',fieldid:\'...\'}',
        function (done) {
            api
                .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
                .set('tenant_id', 'test-tenant')
                .expect(200).end(function (err, res) {
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error)));
                    } else {
                        expect(res.body).to.exist;
                        expect(res.body.modeltype).to.equal(modelName);

                        var fieldMeta = findInControls(res.body.controls, 'main_empId_4');
                        expect(fieldMeta).to.exist;
                        expect(fieldMeta.fieldid).to.equal('empId');
                        expect(fieldMeta.label).to.equal('Employee ID 10');
                        expect(fieldMeta.uitype).to.equal('text');
                        expect(fieldMeta.maxlength).to.equal(10);
                        expect(fieldMeta.minlength).to.equal(10);
                        done();
                    }
                });
        });

    it('should NOT add as a missing field when control is defined as {source: \'...\',fieldid:\'...\'}',
        function (done) {
            api
                .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
                .set('tenant_id', 'test-tenant')
                .expect(200).end(function (err, res) {
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error)));
                    } else {
                        //debug('response body : ' + JSON.stringify(res.body, null, 4));
                        expect(res.body).to.exist;
                        var fieldMeta = findInControls(res.body.controls, 'others_empId');
                        expect(fieldMeta).to.not.exist;

                        done();
                    }
                });
        });

    it('should use \'field\' for binding and \'source\' for meta definition ' +
        'lookup when control is defined as {fieldid:\'...\', source:\'...\'}',
        function (done) {
            api
                .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
                .set('tenant_id', 'test-tenant')
                .expect(200).end(function (err, res) {
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error)));
                    } else {
                        expect(res.body).to.exist;
                        expect(res.body.modeltype).to.equal(modelName);
                        var fieldMeta = findInControls(res.body.controls, 'main_empId_5');
                        expect(fieldMeta).to.exist;
                        expect(fieldMeta.fieldid).to.equal('empId');
                        expect(fieldMeta.label).to.equal('Overriden Employee ID Label');
                        expect(fieldMeta.uitype).to.equal('text');
                        expect(fieldMeta.maxlength).to.equal(10);
                        expect(fieldMeta.minlength).to.equal(10);
                        done();
                    }
                });
        });

    it('should add missing fields to others container', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    expect(res.body.controls).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_bandApplicable');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('boolean');
                    expect(fieldMeta.fieldid).to.equal('bandApplicable');
                    expect(fieldMeta.label).to.equal('Band Applicable');
                    done();
                }
            });
    });

    it('should NOT add missing fields if specified to be skipped', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_salary');
                    expect(fieldMeta).to.not.exist;
                    done();
                }
            });
    });

    it('should add min/max validation from models', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_priorExp');
                    expect(fieldMeta).to.exist;
                    expect(parseFloat(fieldMeta.min)).to.equal(1);
                    expect(parseFloat(fieldMeta.max)).to.equal(50);
                    expect(fieldMeta.minlength).to.not.exist;
                    expect(fieldMeta.maxlength).to.not.exist;
                    expect(fieldMeta.minimum).to.not.exist;
                    expect(fieldMeta.maximum).to.not.exist;
                    done();
                }
            });
    });

    it('should add minlength/maxlength validation from models', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_comments');
                    expect(fieldMeta).to.exist;
                    expect(parseFloat(fieldMeta.minlength)).to.equal(20);
                    expect(parseFloat(fieldMeta.maxlength)).to.equal(120);
                    expect(fieldMeta.min).to.not.exist;
                    expect(fieldMeta.max).to.not.exist;
                    expect(fieldMeta.minimum).to.not.exist;
                    expect(fieldMeta.maximum).to.not.exist;
                    done();
                }
            });
    });
    
    it('should fallback to metadata from model if specified metadata reference is not found', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {

                    //debug(res.body);
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'main_empName_3');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.fieldid).to.equal('empName');
                    expect(fieldMeta.label).to.equal('Emp Name');
                    expect(fieldMeta.uitype).to.equal('text');
                    expect(fieldMeta.maxlength).to.equal(90);
                    done();
                }
            });
    });

    it('field-meta should override model-meta', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {

                    //debug(res.body);
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_joiningDate_6');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('date');

                    fieldMeta = findInControls(res.body.controls, 'others_joiningDate_0');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('text');
                    expect(fieldMeta.label).to.equal('Joining Date');

                    fieldMeta = findInControls(res.body.controls, 'others_joiningDate_1');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('text');

                    done();
                }
            });
    });

    it('control-meta should override field and model-meta', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {

                    //debug(res.body);
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_joiningDate_1');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('text');
                    expect(fieldMeta.label).to.equal('Overriden Joining Date');

                    done();
                }
            });
    });

    it('should create typeahead control for any belongsTo relationship', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_projectId');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('typeahead');
                    expect(fieldMeta.label).to.equal('Project');

                    done();
                }
            });
    });


    it('should create grid control for embedded arrays', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);

                    var fieldMeta = findInControls(res.body.controls, 'others_addresses');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('grid');
                    expect(fieldMeta.label).to.equal('Addresses');
                    expect(fieldMeta.columndefs).to.exist;
                    done();
                }
            });
    });


    it('should have all model properties in grid-columndefs except those starting with _ (underscore) and scope',
        function (done) {
            api
                .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
                .set('tenant_id', 'test-tenant')
                .expect(200).end(function (err, res) {
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error)));
                    } else {

                        //debug(res.body.controlsMeta.others_addresses.columndefs);
                        expect(res.body).to.exist;
                        expect(res.body.modeltype).to.equal(modelName);

                        var fieldMeta = findInControls(res.body.controls, 'others_addresses');
                        expect(fieldMeta).to.exist;
                        expect(fieldMeta.uitype).to.equal('grid');
                        expect(fieldMeta.label).to.equal('Addresses');
                        expect(fieldMeta.columndefs).to.exist;

                        expect(fieldMeta.columndefs).to.contain({
                            uitype: 'string',
                            headerName: 'Line1',
                            field: 'line1',
                            visible: true,
                            filter: 'string',
                            required: true
                        });
                        expect(fieldMeta.columndefs).to.contain({
                            uitype: 'string',
                            headerName: 'City',
                            field: 'city',
                            visible: true,
                            filter: 'string'
                        });
                        expect(fieldMeta.columndefs).to.contain({
                            uitype: 'boolean',
                            headerName: 'Is Current',
                            field: 'isCurrent',
                            visible: true,
                            filter: 'boolean'
                        });
                        expect(fieldMeta.columndefs).to.contain({
                            uitype: 'date',
                            headerName: 'Staying Since',
                            field: 'stayingSince',
                            visible: true,
                            filter: 'date'
                        });

                        expect(fieldMeta.columndefs).to.not.contain({
                            headerName: '_version',
                            field: '_version',
                            filter: 'number'
                        });
                        var scopeColumn = findInColumnData(fieldMeta.columndefs, 'scope');
                        expect(scopeColumn).to.not.exist;

                        done();
                    }
                });
        });

    it('should create grid control for hasMany relationships', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {

                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);

                    var fieldMeta = findInControls(res.body.controls, 'others_tasks');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('grid');
                    expect(fieldMeta.label).to.equal('Tasks');
                    expect(fieldMeta.columndefs).to.exist;

                    done();
                }
            });
    });


    it('should have proper column definitions for hasMany grid', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {

                    //debug(fieldMeta.columndefs);
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_tasks');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('grid');
                    expect(fieldMeta.label).to.equal('Tasks');
                    expect(fieldMeta.columndefs).to.exist;

                    expect(fieldMeta.columndefs).to.contain({
                        uitype: 'string',
                        headerName: 'Task Name',
                        visible: true,
                        required: true,
                        field: 'taskName',
                        filter: 'string'
                    });

                    expect(fieldMeta.columndefs).to.contain({
                        uitype: 'number',
                        headerName: 'Efforts',
                        visible: true,
                        field: 'efforts',
                        filter: 'number'
                    });
                    expect(fieldMeta.columndefs).to.contain({
                        required: true,
                        uitype: 'date',
                        headerName: 'Start Date',
                        field: 'startDate',
                        filter: 'date',
                        visible: true
                    });

                    expect(fieldMeta.columndefs).to.not.contain({
                        headerName: '_version',
                        field: '_version',
                        filter: 'number'
                    });

                    done();
                }
            });
    });

    it('should create tags control for embedded array of primitives', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_skills');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('tags');
                    expect(fieldMeta.label).to.equal('Skills');
                    expect(fieldMeta.itemtype).to.equal('string');
                    done();
                }
            });
    });

    it('should have proper itemtype on tags control of embedded array of primitives', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_rankings');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('tags');
                    expect(fieldMeta.itemtype).to.equal('number');

                    fieldMeta = findInControls(res.body.controls, 'others_revisionDates');
                    expect(fieldMeta).to.exist;
                    expect(fieldMeta.uitype).to.equal('tags');
                    expect(fieldMeta.itemtype).to.equal('date');

                    done();
                }
            });
    });


    it('should return proper data when modeltype is not specified', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/nomodeltype/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.not.exist;
                    expect(res.body.controls).to.exist;
                    var fieldMeta = findInControls(res.body.controls, 'others_empName_0');
                    expect(fieldMeta).to.exist;

                    fieldMeta = findInControls(res.body.controls, 'others_empName_0');
                    expect(fieldMeta).to.exist;

                    done();
                }
            });
    });


    it('should not inject missing properties if UIMetadata.skipMissingProperties=true', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/noinjection/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    //console.log('response body : ' + JSON.stringify(res.body, null, 4));
                    expect(res.body).to.exist;
                    expect(res.body.modeltype).to.equal(modelName);
                    var fieldMeta = findInControls(res.body.controls, 'others_empId');
                    expect(fieldMeta).to.not.exist;

                    fieldMeta = findInControls(res.body.controls, 'others_tasks');
                    expect(fieldMeta).to.not.exist;

                    done();
                }
            });
    });

    it('should populate defaultVM values from model', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    // console.log('response body : ' + JSON.stringify(res.body, null, 4));                    
                    expect(res.body.defaultVM).to.exist;
                    expect(res.body.defaultVM.bandApplicable).to.be.true;

                    done();
                }
            });
    });

    it('should populate defaultVM values from Field-Source', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    expect(res.body.defaultVM).to.exist;
                    expect(res.body.defaultVM.empId).to.equal('XXXXXXXX');

                    done();
                }
            });
    });

    it('should NOT populate defaultVM value for excluded field', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    //console.log('response body : ' + JSON.stringify(res.body, null, 4));                    
                    expect(res.body.defaultVM).to.exist;
                    expect(res.body.defaultVM.salary).to.be.undefined;
                    done();
                }
            });
    });


    it('should populate defaultVM for embedded object', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    //console.log('response body : ' + JSON.stringify(res.body.defaultVM, null, 4));                    
                    expect(res.body.defaultVM).to.exist;
                    expect(res.body.defaultVM.academics).to.exist;
                    expect(res.body.defaultVM.academics.graduation).to.be.true;
                    expect(res.body.defaultVM.academics.matriculation).to.be.true;
                    done();
                }
            });
    });


    it('should populate defaultVM for boolean values always (when not defined, take false)', function (done) {
        api
            .get(bootstrap.basePath + '/UIMetadata/testmetadata/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    expect(res.body).to.exist;
                    //console.log('response body : ' + JSON.stringify(res.body.defaultVM, null, 4));                    
                    expect(res.body.defaultVM).to.exist;
                    expect(res.body.defaultVM.academics).to.exist;
                    expect(res.body.defaultVM.academics.postGraduation).to.be.false;
                    done();
                }
            });
    });
});