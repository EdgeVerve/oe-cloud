/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var bootstrap = require('./bootstrap.js');
var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var api = bootstrap.api;

describe(chalk.blue('Aggregation Functions with having filter test'), function () {
  this.timeout(10000);

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
  ]
  var marksList = loopback.findModel('MarksList');
  before('upload test data', function (done) {
    marksList.create(studentsData, {}, function (err, res) {
      done();
    });
  });

  after('Cleanup', function (done) {
    marksList.destroyAll({}, {}, function modelDestroyAll(err, result) {
      done(err);
    });
  });

  describe(chalk.green('Aggregation Functions having clause Test --REST'), function () {

    var path = bootstrap.basePath + '/' + marksList.pluralModelName;

    it('Test for having clause "=" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":60}}}';
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
            expect(res.body).to.have.length(1);
            expect(res.body[0].maxMaths).to.be.equal(60);
            done();
          }
        });
    });

    it('Test for having clause "neq" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"neq":60}}}}';
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
            expect(res.body).to.have.length(12);
            expect(res.body[0].maxMaths).to.be.not.equal(60);
            done();
          }
        });
    });

    it('Test for having clause "gt" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"gt":60}}}}';
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
            expect(res.body).to.have.length(6);
            expect(res.body[0].maxMaths).to.be.gt(60);
            expect(res.body[1].maxMaths).to.be.gt(60);
            done();
          }
        });
    });

    it('Test for having clause "gte" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"gte":60}}}}';
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
            expect(res.body[0].maxMaths).to.be.gte(60);
            expect(res.body[1].maxMaths).to.be.gte(60);
            done();
          }
        });
    });

    it('Test for having clause "lt" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"lt":50}}}}';
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
            expect(res.body).to.have.length(4);
            expect(res.body[0].maxMaths).to.be.lt(50);
            expect(res.body[1].maxMaths).to.be.lt(50);
            done();
          }
        });
    });

    it('Test for having clause "lte" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"lte":50}}}}';
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
            expect(res.body).to.have.length(5);
            expect(res.body[0].maxMaths).to.be.lte(50);
            expect(res.body[1].maxMaths).to.be.lte(50);
            done();
          }
        });
    });

    it('Test for having clause "between" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"between":[40,80]}}}}';
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
            expect(res.body).to.have.length(8);
            expect(res.body[0].maxMaths).to.be.gte(40);
            expect(res.body[0].maxMaths).to.be.lte(80);
            done();
          }
        });
    });

    it('Test for having clause "inq" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"inq":[60,50,80]}}}}';
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
            expect(res.body[0].maxMaths).to.be.equal(60);
            expect(res.body[1].maxMaths).to.be.equal(80);
            expect(res.body[2].maxMaths).to.be.equal(50);
            done();
          }
        });
    });

    it('Test for having clause "nin" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"max":{"maths":{"nin":[60,50,80]}}}}';
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
            expect(res.body).to.have.length(10);
            expect(res.body[0].maxMaths).to.be.not.equal(60);
            done();
          }
        });
    });

    it('Test for having clause "and" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"and":[{"max":{"maths":60}},{"max":{"maths":{"inq":[50,60,80]}}}]}}';
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
            expect(res.body).to.have.length(1);
            expect(res.body[0].maxMaths).to.be.equal(60);
            done();
          }
        });
    });

    it('Test for having clause "or" operator', function (done) {
      var filter = '{"group":{"groupBy":["section","gender"],"max":{"maths":"maxMaths"}},"order":["section ASC"],"having":{"or":[{"max":{"maths":{"gte":96}}},{"max":{"maths":{"inq":[50,60,80]}}}]}}';
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
            expect(res.body).to.have.length(4);
            expect(res.body[0].maxMaths).to.be.equal(60);
            done();
          }
        });
    });

  });

  describe(chalk.green('Aggregation Functions having clause Test --Programatic'), function () {

    it('Test for having clause "=" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": 60 } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(1);
          expect(res[0].maxMaths).to.be.equal(60);
          done();
        }
      });
    });

    it('Test for having clause "neq" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "neq": 60 } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(12);
          expect(res[0].maxMaths).to.be.not.equal(60);
          done();
        }
      });
    });

    it('Test for having clause "gt" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "gt": 60 } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(6);
          expect(res[0].maxMaths).to.be.gt(60);
          expect(res[1].maxMaths).to.be.gt(60);
          done();
        }
      });
    });

    it('Test for having clause "gte" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "gte": 60 } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(7);
          expect(res[0].maxMaths).to.be.gte(60);
          expect(res[1].maxMaths).to.be.gte(60);
          done();
        }
      });
    });

    it('Test for having clause "lt" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "lt": 50 } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(4);
          expect(res[0].maxMaths).to.be.lt(50);
          expect(res[1].maxMaths).to.be.lt(50);
          done();
        }
      });
    });

    it('Test for having clause "lte" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "lte": 50 } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(5);
          expect(res[0].maxMaths).to.be.lte(50);
          expect(res[1].maxMaths).to.be.lte(50);
          done();
        }
      });
    });

    it('Test for having clause "between" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "between": [40, 80] } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(8);
          expect(res[0].maxMaths).to.be.gte(40);
          expect(res[0].maxMaths).to.be.lte(80);
          done();
        }
      });
    });

    it('Test for having clause "inq" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "inq": [60, 50, 80] } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(3);
          expect(res[0].maxMaths).to.be.equal(60);
          expect(res[1].maxMaths).to.be.equal(80);
          expect(res[2].maxMaths).to.be.equal(50);
          done();
        }
      });
    });

    it('Test for having clause "nin" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "max": { "maths": { "nin": [60, 50, 80] } } } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(10);
          expect(res[0].maxMaths).to.be.not.equal(60);
          done();
        }
      });
    });

    it('Test for having clause "and" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "and": [{ "max": { "maths": 60 } }, { "max": { "maths": { "inq": [50, 60, 80] } } }] } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(1);
          expect(res[0].maxMaths).to.be.equal(60);
          done();
        }
      });
    });

    it('Test for having clause "or" operator', function (done) {
      var filter = { "group": { "groupBy": ["section", "gender"], "max": { "maths": "maxMaths" } }, "order": ["section ASC"], "having": { "or": [{ "max": { "maths": { "gte": 96 } } }, { "max": { "maths": { "inq": [50, 60, 80] } } }] } };
      marksList.find(filter, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("---> result", res);
          expect(res).not.to.be.null;
          expect(res).not.to.be.empty;
          expect(res).not.to.be.undefined;
          expect(res).to.have.length(4);
          expect(res[0].maxMaths).to.be.equal(60);
          done();
        }
      });
    });

  });

});