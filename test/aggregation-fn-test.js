/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var api = bootstrap.api;
var models = bootstrap.models;
var loopback = require('loopback');
var app = bootstrap.app;

describe(chalk.blue('Aggregation Functions with group filter test'), function () {
  this.timeout(20000);
  var marksList;
  var studentsData = [
    {
      "name": "Rickon",
      "maths": 14,
      "physics": 32,
      "chemistry": 23,
      "section": "Bravo",
      "gender": "Male"
    }, {
      "name": "Sansa",
      "maths": 15,
      "physics": 16,
      "chemistry": 51,
      "section": "Bravo",
      "gender": "Female"
    }, {
      "name": "Bran",
      "maths": 14,
      "physics": 72,
      "chemistry": 96,
      "section": "Charlie",
      "gender": "Male"
    }, {
      "name": "Cersei",
      "maths": 17,
      "physics": 2,
      "chemistry": 29,
      "section": "Charlie",
      "gender": "Female"
    }, {
      "name": "Arya",
      "maths": 20,
      "physics": 81,
      "chemistry": 70,
      "section": "Delta",
      "gender": "Female"
    }, {
      "name": "Eddard",
      "maths": 33,
      "physics": 72,
      "chemistry": 36,
      "section": "Charlie",
      "gender": "Male"
    }, {
      "name": "Tyrion",
      "maths": 64,
      "physics": 34,
      "chemistry": 73,
      "section": "Echo",
      "gender": "Male"
    }, {
      "name": "Jaime",
      "maths": 20,
      "physics": 79,
      "chemistry": 25,
      "section": "Delta",
      "gender": "Male"
    }, {
      "name": "Shae",
      "maths": 47,
      "physics": 36,
      "chemistry": 1,
      "section": "Echo",
      "gender": "Female"
    }, {
      "name": "Ygritte",
      "maths": 66,
      "physics": 99,
      "chemistry": 3,
      "section": "Golf",
      "gender": "Female"
    }, {
      "name": "Ramsay",
      "maths": 79,
      "physics": 18,
      "chemistry": 97,
      "section": "Alpha",
      "gender": "Male"
    }, {
      "name": "Daenerys",
      "maths": 60,
      "physics": 74,
      "chemistry": 10,
      "section": "Alpha",
      "gender": "Female"
    }, {
      "name": "Samwell",
      "maths": 19,
      "physics": 20,
      "chemistry": 40,
      "section": "Golf",
      "gender": "Male"
    }, {
      "name": "Jon",
      "maths": 41,
      "physics": 66,
      "chemistry": 71,
      "section": "Alpha",
      "gender": "Male"
    }, {
      "name": "Davos",
      "maths": 19,
      "physics": 11,
      "chemistry": 100,
      "section": "Delta",
      "gender": "Male"
    }, {
      "name": "Robb",
      "maths": 65,
      "physics": 17,
      "chemistry": 67,
      "section": "Delta",
      "gender": "Male"
    }, {
      "name": "Robert",
      "maths": 20,
      "physics": 91,
      "chemistry": 96,
      "section": "Golf",
      "gender": "Male"
    }, {
      "name": "Podrick",
      "maths": 80,
      "physics": 1,
      "chemistry": 79,
      "section": "Delta",
      "gender": "Male"
    }, {
      "name": "Missendei",
      "maths": 21,
      "physics": 5,
      "chemistry": 5,
      "section": "Delta",
      "gender": "Female"
    }, {
      "name": "Varys",
      "maths": 71,
      "physics": 40,
      "chemistry": 16,
      "section": "Charlie",
      "gender": "Male"
    }, {
      "name": "Margaery",
      "maths": 58,
      "physics": 69,
      "chemistry": 86,
      "section": "Echo",
      "gender": "Female"
    }, {
      "name": "Hodor",
      "maths": 20,
      "physics": 84,
      "chemistry": 97,
      "section": "Bravo",
      "gender": "Male"
    }, {
      "name": "Theon",
      "maths": 36,
      "physics": 5,
      "chemistry": 41,
      "section": "Foxtrot",
      "gender": "Male"
    }, {
      "name": "Jorah",
      "maths": 42,
      "physics": 97,
      "chemistry": 77,
      "section": "Bravo",
      "gender": "Male"
    }, {
      "name": "Khal",
      "maths": 34,
      "physics": 46,
      "chemistry": 87,
      "section": "Alpha",
      "gender": "Male"
    }, {
      "name": "Brienne",
      "maths": 90,
      "physics": 2,
      "chemistry": 23,
      "section": "Delta",
      "gender": "Female"
    }, {
      "name": "Daario",
      "maths": 96,
      "physics": 4,
      "chemistry": 6,
      "section": "Echo",
      "gender": "Male"
    }, {
      "name": "Joffrey",
      "maths": 50,
      "physics": 9,
      "chemistry": 65,
      "section": "Foxtrot",
      "gender": "Male"
    }, {
      "name": "Melisandre",
      "maths": 25,
      "physics": 59,
      "chemistry": 20,
      "section": "Echo",
      "gender": "Female"
    }, {
      "name": "Baelish",
      "maths": 2,
      "physics": 13,
      "chemistry": 77,
      "section": "Delta",
      "gender": "Male"
    }
  ];
  var marksListDef = {
    "name": "MarksList",
    "Base": "BaseEntity",
    "plural": "MarksLists",
    "properties": {
      "name": "string",
      "maths": "number",
      "physics": "number",
      "chemistry": "number",
      "section": "string",
      "gender": "string"
    },
    "strict": false
  };

  before('Create Test model and upload test data', function (done) {
    models.ModelDefinition.create(marksListDef, bootstrap.defaultContext, function (err, res) {
      if (err) {
        console.log('unable to create marksList model');
        done(err);
      } else {
        marksList = loopback.getModel('MarksList', bootstrap.defaultContext);
        marksList.create(studentsData, { 'ctx': { 'tenantId': 'test-tenant' } }, function (err, res) {
          done();
        });
      }
    });
  });

  after('Remove Test Model', function (done) {
    marksList.destroyAll({}, { 'ctx': { 'tenantId': 'test-tenant' } }, function modelDestroyAll(err, result) {
      if (err) {
        done(err);
      }
      done();
    });
  });

  describe(chalk.green('Aggregation Functions Test --REST'), function () {

    var path = bootstrap.basePath + '/' + marksListDef.plural;

    it('Test for GROUP BY clause', function (done) {
      var filter = '{"group":{"groupBy":["section"]}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(7);
            expect(res.body[0]).to.include.keys('section');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            done();
          }
        });
    });

    it('Test for MAX aggregation function', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"max":{"maths":"maxMathsMarks","physics":"maxPhysicsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[1].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[0].maxPhysicsMarks).to.be.oneOf([99, 97]);
            expect(res.body[1].maxPhysicsMarks).to.be.oneOf([99, 97]);
            done();
          }
        });
    });

    it('Test for MIN aggregation function', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"min":{"maths":"minMathsMarks","physics":"minPhysicsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].minMathsMarks).to.be.oneOf([15, 2]);
            expect(res.body[1].minMathsMarks).to.be.oneOf([15, 2]);
            expect(res.body[0].minPhysicsMarks).to.be.oneOf([2, 1]);
            expect(res.body[1].minPhysicsMarks).to.be.oneOf([2, 1]);
            done();
          }
        });
    });

    it('Test for AVG aggregation function', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"avg":{"chemistry":"avgChemistryMarks","maths":"avgMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
            expect(res.body[1].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
            expect(res.body[0].avgMathsMarks).to.be.oneOf([41.9, 40.95]);
            expect(res.body[1].avgMathsMarks).to.be.oneOf([41.9, 40.95]);
            done();
          }
        });
    });

    it('Test for COUNT aggregation function', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"count":{"gender":"noOfStudents"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].noOfStudents).to.be.oneOf([10, 20]);
            expect(res.body[1].noOfStudents).to.be.oneOf([10, 20]);
            done();
          }
        });
    });

    it('Test for SUM aggregation function', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"sum":{"chemistry":"sumOfChemistryMarks","physics":"sumOfPhysicsMarks","maths":"sumOfMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].sumOfChemistryMarks).to.be.oneOf([298, 1269]);
            expect(res.body[1].sumOfChemistryMarks).to.be.oneOf([298, 1269]);
            expect(res.body[0].sumOfPhysicsMarks).to.be.oneOf([443, 811]);
            expect(res.body[1].sumOfPhysicsMarks).to.be.oneOf([443, 811]);
            expect(res.body[0].sumOfMathsMarks).to.be.oneOf([419, 819]);
            expect(res.body[1].sumOfMathsMarks).to.be.oneOf([419, 819]);
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions', function (done) {
      var filter = '{"group":{"groupBy":["gender"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"},"min":{"physics":"minPhysics"},"sum":{"maths":"totalMathsMarks"},"count":{"name":"headCount"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
            expect(res.body[1].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
            expect(res.body[0].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[1].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[0].minPhysics).to.be.oneOf([2, 1]);
            expect(res.body[1].minPhysics).to.be.oneOf([2, 1]);
            expect(res.body[0].totalMathsMarks).to.be.oneOf([419, 819]);
            expect(res.body[1].totalMathsMarks).to.be.oneOf([419, 819]);
            expect(res.body[0].headCount).to.be.oneOf([10, 20]);
            expect(res.body[1].headCount).to.be.oneOf([10, 20]);
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "where" filter', function (done) {
      var filter = '{"where":{"maths":{"gt":35}},"group":{"groupBy":["gender"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"},"min":{"physics":"minPhysics"},"sum":{"maths":"totalMathsMarks"},"count":{"name":"headCount"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
            expect(res.body[0].avgChemistryMarks).to.be.oneOf([24.6, 59.2]);
            expect(res.body[1].avgChemistryMarks).to.be.oneOf([24.6, 59.2]);
            expect(res.body[0].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[1].maxMathsMarks).to.be.oneOf([90, 96]);
            expect(res.body[0].minPhysics).to.be.oneOf([2, 1]);
            expect(res.body[1].minPhysics).to.be.oneOf([2, 1]);
            expect(res.body[0].totalMathsMarks).to.be.oneOf([321, 624]);
            expect(res.body[1].totalMathsMarks).to.be.oneOf([321, 624]);
            expect(res.body[0].headCount).to.be.oneOf([5, 10]);
            expect(res.body[1].headCount).to.be.oneOf([5, 10]);
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "fields" filter', function (done) {
      var filter = '{"fields":["avgChemistryMarks","gender"],"group":{"groupBy":["gender"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(2);
            expect(res.body[0]).to.include.keys('gender', 'avgChemistryMarks');
            expect(res.body[0]).to.not.include.keys('maths', 'physics', 'chemistry', 'name', 'section', 'maxMathsMarks');
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "order" filter', function (done) {
      var filter = '{"order":["section DESC"],"group":{"groupBy":["section"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(7);
            expect(res.body[0].section).to.be.equal('Golf');
            expect(res.body[1].section).to.be.equal('Foxtrot');
            expect(res.body[2].section).to.be.equal('Echo');
            expect(res.body[3].section).to.be.equal('Delta');
            expect(res.body[4].section).to.be.equal('Charlie');
            expect(res.body[5].section).to.be.equal('Bravo');
            expect(res.body[6].section).to.be.equal('Alpha');
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "order" filter(on non existing field)', function (done) {
      var filter = '{"order":["section ASC", "gender DESC"],"group":{"groupBy":["section"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(7);
            expect(res.body[0].gender).to.be.equal(undefined);
            expect(res.body[6].section).to.be.equal('Golf');
            expect(res.body[5].section).to.be.equal('Foxtrot');
            expect(res.body[4].section).to.be.equal('Echo');
            expect(res.body[3].section).to.be.equal('Delta');
            expect(res.body[2].section).to.be.equal('Charlie');
            expect(res.body[1].section).to.be.equal('Bravo');
            expect(res.body[0].section).to.be.equal('Alpha');
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "limit" filter', function (done) {
      var filter = '{"limit":3,"order":["section ASC"],"group":{"groupBy":["section"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(3);
            expect(res.body[2].section).to.be.equal('Charlie');
            expect(res.body[1].section).to.be.equal('Bravo');
            expect(res.body[0].section).to.be.equal('Alpha');
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "skip" filter', function (done) {
      var filter = '{"limit":3,"skip":2,"order":["section ASC"],"group":{"groupBy":["section"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(3);
            expect(res.body[0].section).to.be.equal('Charlie');
            expect(res.body[1].section).to.be.equal('Delta');
            expect(res.body[2].section).to.be.equal('Echo');
            done();
          }
        });
    });

    it('Test for applying multiple aggregation functions with "offset" filter', function (done) {
      var filter = '{"limit":3,"offset":2,"order":["section ASC"],"group":{"groupBy":["section"],"avg":{"chemistry":"avgChemistryMarks"},"max":{"maths":"maxMathsMarks"}}}';
      var url = path + '?filter=' + filter;
      api
        .get(url)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(200).end(function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log("---> result", res.body);
            expect(res.body).not.to.be.null;
            expect(res.body).not.to.be.empty;
            expect(res.body).not.to.be.undefined;
            expect(res.body).to.have.length(3);
            expect(res.body[0].section).to.be.equal('Charlie');
            expect(res.body[1].section).to.be.equal('Delta');
            expect(res.body[2].section).to.be.equal('Echo');
            done();
          }
        });
    });
  });


  describe(chalk.green('Aggregation Functions Test --Programmatic'), function () {

    it('Test for GROUP BY clause', function (done) {
      var filter = { "group": { "groupBy": ["section"] } };

      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(7);
          expect(res[0].__data).to.include.keys('section');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          done();
        }
      });
    });

    it('Test for MAX aggregation function', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "max": { "maths": "maxMathsMarks", "physics": "maxPhysicsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[1].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[0].maxPhysicsMarks).to.be.oneOf([99, 97]);
          expect(res[1].maxPhysicsMarks).to.be.oneOf([99, 97]);
          done();
        }
      });
    });

    it('Test for MIN aggregation function', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "min": { "maths": "minMathsMarks", "physics": "minPhysicsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].minMathsMarks).to.be.oneOf([15, 2]);
          expect(res[1].minMathsMarks).to.be.oneOf([15, 2]);
          expect(res[0].minPhysicsMarks).to.be.oneOf([2, 1]);
          expect(res[1].minPhysicsMarks).to.be.oneOf([2, 1]);
          done();
        }
      });
    });

    it('Test for AVG aggregation function', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "avg": { "chemistry": "avgChemistryMarks", "maths": "avgMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
          expect(res[1].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
          expect(res[0].avgMathsMarks).to.be.oneOf([41.9, 40.95]);
          expect(res[1].avgMathsMarks).to.be.oneOf([41.9, 40.95]);
          done();
        }
      });
    });

    it('Test for COUNT aggregation function', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "count": { "gender": "noOfStudents" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].noOfStudents).to.be.oneOf([10, 20]);
          expect(res[1].noOfStudents).to.be.oneOf([10, 20]);
          done();
        }
      });
    });

    it('Test for SUM aggregation function', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "sum": { "chemistry": "sumOfChemistryMarks", "physics": "sumOfPhysicsMarks", "maths": "sumOfMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].sumOfChemistryMarks).to.be.oneOf([298, 1269]);
          expect(res[1].sumOfChemistryMarks).to.be.oneOf([298, 1269]);
          expect(res[0].sumOfPhysicsMarks).to.be.oneOf([443, 811]);
          expect(res[1].sumOfPhysicsMarks).to.be.oneOf([443, 811]);
          expect(res[0].sumOfMathsMarks).to.be.oneOf([419, 819]);
          expect(res[1].sumOfMathsMarks).to.be.oneOf([419, 819]);
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions', function (done) {
      var filter = { "group": { "groupBy": ["gender"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" }, "min": { "physics": "minPhysics" }, "sum": { "maths": "totalMathsMarks" }, "count": { "name": "headCount" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
          expect(res[1].avgChemistryMarks).to.be.oneOf([29.8, 63.45]);
          expect(res[0].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[1].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[0].minPhysics).to.be.oneOf([2, 1]);
          expect(res[1].minPhysics).to.be.oneOf([2, 1]);
          expect(res[0].totalMathsMarks).to.be.oneOf([419, 819]);
          expect(res[1].totalMathsMarks).to.be.oneOf([419, 819]);
          expect(res[0].headCount).to.be.oneOf([10, 20]);
          expect(res[1].headCount).to.be.oneOf([10, 20]);
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "where" filter', function (done) {
      var filter = { "where": { "maths": { "gt": 35 } }, "group": { "groupBy": ["gender"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" }, "min": { "physics": "minPhysics" }, "sum": { "maths": "totalMathsMarks" }, "count": { "name": "headCount" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name');
          expect(res[0].avgChemistryMarks).to.be.oneOf([24.6, 59.2]);
          expect(res[1].avgChemistryMarks).to.be.oneOf([24.6, 59.2]);
          expect(res[0].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[1].maxMathsMarks).to.be.oneOf([90, 96]);
          expect(res[0].minPhysics).to.be.oneOf([2, 1]);
          expect(res[1].minPhysics).to.be.oneOf([2, 1]);
          expect(res[0].totalMathsMarks).to.be.oneOf([321, 624]);
          expect(res[1].totalMathsMarks).to.be.oneOf([321, 624]);
          expect(res[0].headCount).to.be.oneOf([5, 10]);
          expect(res[1].headCount).to.be.oneOf([5, 10]);
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "fields" filter', function (done) {
      var filter = { "fields": ["avgChemistryMarks", "gender"], "group": { "groupBy": ["gender"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(2);
          expect(res[0].__data).to.include.keys('gender', 'avgChemistryMarks');
          expect(res[0].__data).to.not.include.keys('maths', 'physics', 'chemistry', 'name', 'section', 'maxMathsMarks');
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "order" filter', function (done) {
      var filter = { "order": ["section DESC"], "group": { "groupBy": ["section"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(7);
          expect(res[0].section).to.be.equal('Golf');
          expect(res[1].section).to.be.equal('Foxtrot');
          expect(res[2].section).to.be.equal('Echo');
          expect(res[3].section).to.be.equal('Delta');
          expect(res[4].section).to.be.equal('Charlie');
          expect(res[5].section).to.be.equal('Bravo');
          expect(res[6].section).to.be.equal('Alpha');
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "order" filter(on non existing field)', function (done) {
      var filter = { "order": ["section ASC", "gender DESC"], "group": { "groupBy": ["section"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(7);
          expect(res[0].gender).to.be.equal(undefined);
          expect(res[6].section).to.be.equal('Golf');
          expect(res[5].section).to.be.equal('Foxtrot');
          expect(res[4].section).to.be.equal('Echo');
          expect(res[3].section).to.be.equal('Delta');
          expect(res[2].section).to.be.equal('Charlie');
          expect(res[1].section).to.be.equal('Bravo');
          expect(res[0].section).to.be.equal('Alpha');
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "limit" filter', function (done) {
      var filter = { "limit": 3, "order": ["section ASC"], "group": { "groupBy": ["section"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(3);
          expect(res[2].section).to.be.equal('Charlie');
          expect(res[1].section).to.be.equal('Bravo');
          expect(res[0].section).to.be.equal('Alpha');
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "skip" filter', function (done) {
      var filter = { "limit": 3, "skip": 2, "order": ["section ASC"], "group": { "groupBy": ["section"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(3);
          expect(res[0].section).to.be.equal('Charlie');
          expect(res[1].section).to.be.equal('Delta');
          expect(res[2].section).to.be.equal('Echo');
          done();
        }
      });
    });

    it('Test for applying multiple aggregation functions with "offset" filter', function (done) {
      var filter = { "limit": 3, "offset": 2, "order": ["section ASC"], "group": { "groupBy": ["section"], "avg": { "chemistry": "avgChemistryMarks" }, "max": { "maths": "maxMathsMarks" } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(3);
          expect(res[0].section).to.be.equal('Charlie');
          expect(res[1].section).to.be.equal('Delta');
          expect(res[2].section).to.be.equal('Echo');
          done();
        }
      });
    });

  });




});