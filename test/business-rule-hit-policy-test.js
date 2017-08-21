/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var async = require('async');
var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var models = bootstrap.models;
var decisionTableRules = ['RoutingRules', 'ElectricityBill', 'Holidays', 'Membership', 'LoanEligibility'];
var decision_table = {};

describe(chalk.blue('Decision table evaluation'), function () {
    this.timeout(60000);
    before('Create DecisionTables', function (done) {
        const filepath = path.resolve(path.join(__dirname, 'business-rule-data', 'DecisionTable.json'));
        const DTData = require(filepath);

        async.eachSeries(DTData, function (decisionTable, callback) {
            models.DecisionTable.create(decisionTable, bootstrap.defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    callback(err);
                } else {
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log(err);
                done(err);
            } else {
                done();
            }
        });

    });

    it('Priority hit policy', function (done) {
        var payload = { "Applicant Age": 70, "Medical History": "bad" };
        models.DecisionTable.exec("ApplicantRiskRating", payload, bootstrap.defaultContext, function (err, result) {
            expect(result['Applicant Risk Rating']).to.equal("High");
            done();
        });
    });

    it('Output hit policy', function (done) {
        var payload = { "Age": 18, "Risk category": "High", "Debt review": "false" };
        models.DecisionTable.exec("RoutingRulesOutput", payload, bootstrap.defaultContext, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.Routing.length).to.be.equal(2);
                expect(result.Routing[1]).to.contain('Accept');
                expect(result.Routing[0]).to.contain('Refer');

                expect(result['Review level'].length).to.be.equal(2);
                expect(result['Review level'][1]).to.contain('None');
                expect(result['Review level'][0]).to.contain('Level1');

                expect(result.Reason.length).to.be.equal(2);
                expect(result.Reason[1]).to.contain('Acceptable');
                expect(result.Reason[0]).to.contain('High risk application');

                done();
            }
        });
    });

    it('Collect hit policy without any operator', function (done) {
        var payload = { "Age": 18, "Risk category": "High", "Debt review": "false" };
        models.DecisionTable.exec("RoutingRules", payload, bootstrap.defaultContext, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.Routing.length).to.be.equal(2);
                expect(result.Routing).to.contain('Accept');
                expect(result.Routing).to.contain('Refer');

                expect(result['Review level'].length).to.be.equal(2);
                expect(result['Review level']).to.contain('None');
                expect(result['Review level']).to.contain('Level1');

                expect(result.Reason.length).to.be.equal(2);
                expect(result.Reason).to.contain('Acceptable');
                expect(result.Reason).to.contain('High risk application');

                done();
            }
        });
    });

    it('Collect hit policy with + operator for numbers', function (done) {
        var payload = { "State": "Karnataka", "Units": 150 };
        models.DecisionTable.exec("ElectricityBill", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.Amount).to.equal(693);
            done();
        });
    });

    it('Collect hit policy with < operator for numbers', function (done) {
        var payload = { "Age": 100, "Years of Service": 200 };
        models.DecisionTable.exec("HolidaysMin", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.Holidays).to.equal(3);
            done();
        });
    });

    it('Collect hit policy with > operator for numbers', function (done) {
        var payload = { "Age": 100, "Years of Service": 200 };
        models.DecisionTable.exec("HolidaysMax", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.Holidays).to.equal(22);
            done();
        });
    });

    it('Collect hit policy with # operator for numbers', function (done) {
        var payload = { "Age": 100, "Years of Service": 200 };
        models.DecisionTable.exec("HolidaysCount", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.Holidays).to.equal(3);
            done();
        });
    });

    it('Collect hit policy with + operator for strings', function (done) {
        var payload = { "loanAmount": 2000, "salary": 20000 };
        models.DecisionTable.exec("MembershipSum", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.membership).to.equal("SILVER GENERAL");
            done();
        });
    });

    it('Collect hit policy with < operator for strings', function (done) {
        var payload = { "loanAmount": 30000, "salary": 60000 };
        models.DecisionTable.exec("MembershipMin", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.membership).to.equal("GENERAL");
            done();
        });
    });

    it('Collect hit policy with > operator for strings', function (done) {
        var payload = { "loanAmount": 12000, "salary": 110000 };
        models.DecisionTable.exec("MembershipMax", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.membership).to.equal("SILVER");
            done();
        });
    });

    it('Collect hit policy with # operator for strings', function (done) {
        var payload = { "loanAmount": 1000, "salary": 200000 };
        models.DecisionTable.exec("MembershipCount", payload, bootstrap.defaultContext, function (err, result) {
            expect(result.membership).to.equal(4);
            done();
        });
    });

    it('Collect hit policy with + operator for boolean', function (done) {
        var payload1 = { "age": 40, "salary": 55000 };//T, T
        var payload2 = { "age": 18, "salary": 6000 };//F, F
        var payload3 = { "age": 30, "salary": 55000 };//T, T, F
        models.DecisionTable.exec("LoanEligibilitySum", payload3, bootstrap.defaultContext, function (err3, result3) {
            expect(result3.LoanEligibility).to.equal(false);
            models.DecisionTable.exec("LoanEligibilitySum", payload2, bootstrap.defaultContext, function (err2, result2) {
                expect(result2.LoanEligibility).to.equal(false);
                models.DecisionTable.exec("LoanEligibilitySum", payload1, bootstrap.defaultContext, function (err1, result1) {
                    expect(result1.LoanEligibility).to.equal(true);
                    done();
                });
            });
        });
    });

    it('Collect hit policy with < operator for boolean', function (done) {
        var payload1 = { "age": 40, "salary": 55000 };//T, T
        var payload2 = { "age": 18, "salary": 6000 };//F, F
        var payload3 = { "age": 30, "salary": 55000 };//T, T, F
        models.DecisionTable.exec("LoanEligibilityMin", payload3, bootstrap.defaultContext, function (err3, result3) {
            expect(result3.LoanEligibility).to.equal(0);
            models.DecisionTable.exec("LoanEligibilityMin", payload2, bootstrap.defaultContext, function (err2, result2) {
                expect(result2.LoanEligibility).to.equal(0);
                models.DecisionTable.exec("LoanEligibilityMin", payload1, bootstrap.defaultContext, function (err1, result1) {
                    expect(result1.LoanEligibility).to.equal(1);
                    done();
                });
            });
        });
    });

    it('Collect hit policy with > operator for boolean', function (done) {
        var payload1 = { "age": 40, "salary": 55000 };//T, T
        var payload2 = { "age": 18, "salary": 6000 };//F, F
        var payload3 = { "age": 30, "salary": 55000 };//T, T, F
        models.DecisionTable.exec("LoanEligibilityMax", payload3, bootstrap.defaultContext, function (err3, result3) {
            expect(result3.LoanEligibility).to.equal(1);
            models.DecisionTable.exec("LoanEligibilityMax", payload2, bootstrap.defaultContext, function (err2, result2) {
                expect(result2.LoanEligibility).to.equal(0);
                models.DecisionTable.exec("LoanEligibilityMax", payload1, bootstrap.defaultContext, function (err1, result1) {
                    expect(result1.LoanEligibility).to.equal(1);
                    done();
                });
            });
        });
    });

    it('Collect hit policy with # operator for boolean', function (done) {
        var payload1 = { "age": 40, "salary": 55000 };//T, T
        var payload2 = { "age": 18, "salary": 6000 };//F, F
        var payload3 = { "age": 30, "salary": 55000 };//T, T, F
        models.DecisionTable.exec("LoanEligibilityCount", payload3, bootstrap.defaultContext, function (err3, result3) {
            expect(result3.LoanEligibility).to.equal(2);
            models.DecisionTable.exec("LoanEligibilityCount", payload2, bootstrap.defaultContext, function (err2, result2) {
                expect(result2.LoanEligibility).to.equal(1);
                models.DecisionTable.exec("LoanEligibilityCount", payload1, bootstrap.defaultContext, function (err1, result1) {
                    expect(result1.LoanEligibility).to.equal(1);
                    done();
                });
            });
        });
    });

});