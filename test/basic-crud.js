/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;
var uuid = require('node-uuid');


describe('basic-crud', function () {

    this.timeout(3000000);

    var app = bootstrap.app;
    var options = {};
    var Note = app.models.Note;
    var baseurl = app.get('restApiRoot');
    var options = {};
    var Note = app.models.Note;
    var data = {
        title: 'my note',
        content: 'Hello word',
        id: uuid.v4()
    };

    var baseurl = app.get('restApiRoot');


    var inst;

    it('create and upsert', function () {
        var createData = { 'content': 'Hyundai' };
        return Note.create(createData, bootstrap.defaultContext).then(function (result) {
            var upsertData = { 'id': result.id, '_version': result._version, 'content': 'BMW' };
            return Note.upsert(upsertData, bootstrap.defaultContext).then(function (res) {
                expect(result.id).to.be.equal(res.id);
                expect(res.content).to.be.equal('BMW');
                expect(res._oldVersion).to.be.equal(result._version);
                expect(res._version).to.not.equal(undefined);
                expect(res._version).to.not.equal(res._oldVersion);
                expect(res._newVersion).to.be.oneOf([null, undefined]);
            });
        });
    });

    it('create', function (done) {
        Note.create(data, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.id).to.be.equal(data.id);
            expect(rec._version).to.be.defined;
            inst = rec;
            done();
        });
    });

    it('create with _version', function (done) {
        var data = {
            title: 'with _version',
            content: 'asdasd',
            id: uuid.v4(),
            _version: uuid.v4()
        };
        Note.create(data, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.id).to.be.equal(data.id);
            expect(rec._version).to.be.defined;
            inst = rec;
            done();
        });
    });

    it('create with _newVersion', function (done) {
        var data = {
            title: 'with _version',
            content: 'asdasd',
            id: uuid.v4(),
            _newVersion: uuid.v4()
        };
        Note.create(data, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.id).to.be.equal(data.id);
            expect(rec._version).to.be.defined;
            inst = rec;
            done();
        });
    });

    it('create with _cersion and _newVersion', function (done) {
        var data = {
            title: 'with _version',
            content: 'asdasd',
            id: uuid.v4(),
            _version: uuid.v4(),
            _newVersion: uuid.v4()
        };
        Note.create(data, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.id).to.be.equal(data.id);
            expect(rec._version).to.be.defined;
            inst = rec;
            done();
        });
    });

    it('findById', function (done) {
        Note.findById(inst.id, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.not.ok;
            expect(rec.id).to.be.equal(inst.id);
            expect(rec._version).to.be.equal(inst._version);
            data = rec;
            done();
        });
    });

    it('update', function (done) {
        // multiple updates
        var where = {
            id: data.id
        };
        var updateData = {
            content: 'updated data'
        }

        Note.update(where, updateData, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.count).to.be.equal(1);
            done();
        });
    });

    it('updateAttributes', function (done) {
        // there should not be need to pass 
        // version as inst is the current instance on which we are working
        var updateData = {
            content: 'update1'
        };
        // updateData._version = inst._version;
        inst.updateAttributes(updateData, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.null;
            expect(rec.content).to.be.equal(updateData.content);
            // response returned is the full instance
            inst = rec;
            done();
        });
    });

    it('delete', function (done) {
        // version must be passed
        Note.deleteById(data.id, bootstrap.defaultContext, function (err, rec) {
            if (err) console.log(err);
            if (err) return done(err);
            expect(err).to.be.not.ok;
            expect(rec.count).to.be.equal(1);
            done();
        });
    });

    it('find after delete', function (done) {
        Note.findById(data.id, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.defined;
            done();
        });
    });
    
    it('find after delete', function (done) {
        var query = {
            where : {
                id: data.id
            },
            fetchDeleted : true
        }
        Note.find(query, bootstrap.defaultContext, function (err, rec) {
            expect(err).to.be.defined;
            done();
        });
    });
    
    it('upsert after delete', function (done) {
        var updateData = {
            title: 'my note 2',
            content: 'Hello word',
            id: data.id,
            _version : 'sdasd'
        };
        Note.upsert(updateData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                expect(err.type).to.be.equal('DataDeletedError');
                done();
            } else {
                done('Error: Should not be bale to modify deleted record');
            }
        });
    });

});
