/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
// Pass the port number and proxy url as command line args in the same order.
var bootstrap = require('../bootstrap');
var chai = require('chai');
var app = bootstrap.app;
var models =  bootstrap.models;
var expect = chai.expect;
chai.use(require('chai-things'));
var supertest = require('supertest');
var request, url;
var modelPlural = 'ConsistentHashModels';
var numberOfReqs = 10;
var host, port;
if(process.argv[3] && !isNaN(parseInt(process.argv[3]))){
    app.set('port', process.argv[3]);
}
if(process.env.APP_URL){
    url = process.env.APP_URL;
    request = supertest(url);
}
describe('Consistent Hash Client', function(){
    var access_token = '';
    before('Login and get Access Token', function(done) {
        bootstrap.login(function(accessToken){
            access_token = accessToken;
            done();
        });
    });
    describe('With REST Api', function() {
        this.timeout(10000);
        describe('GET Round Robin', function(){
            var ac1Host, ac1Port, ac2Host, ac2Port;
            it('/api/ConsistentHashModels', function(done){
                if(url && request){
                    var reqUrl = '/' +  modelPlural + '?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            if(res.text){
                                res.text = JSON.parse(res.text);
                                ac1Host = res.text[0].hostname;
                                ac1Port = res.text[0].portNumber;
                                ac2Host = res.text[1].hostname;
                                ac2Port = res.text[1].portNumber;
                                doTestRoundRobin(0, done);
                            } else {
                                done(new Error("Response doesnt have body in it."));
                            }
                        }
                    });
                } else {
                    done(new Error("Proxy url not provided, couldn't construct the request object."));
                }
                function doTestRoundRobin(count, done){
                    if(count < numberOfReqs){
                        var reqUrl = '/' +  modelPlural+'?access_token='+access_token;
                        getRequest(reqUrl, function(err, res){
                            if(err){
                                done(err);
                            } else {
                                expect(res.text).not.to.be.null;
                                res.text = JSON.parse(res.text);
                                // the below tests are valid - atleast the hostname in docker - framework paas environment
                                //expect(res.text[0].hostname).not.to.be.equal(ac1Host);
                                //expect(res.text[1].hostname).not.to.be.equal(ac2Host);
                                expect(res.text[0].portNumber).not.to.be.equal(ac1Port);
                                expect(res.text[1].portNumber).not.to.be.equal(ac2Port);
                                expect(res.text[0].hostname).to.be.equal(res.text[1].hostname);
                                expect(res.text[0].portNumber).to.be.equal(res.text[1].portNumber);
                                ac1Host = res.text[0].hostname;
                                ac1Port = res.text[0].portNumber;
                                ac2Host = res.text[1].hostname;
                                ac2Port = res.text[1].portNumber;
                                doTestRoundRobin(count + 1, done);
                            }
                        });
                    } else {
                        done();
                    }
                }
            });
        });
        describe('GET by id', function() {
            it('consist-101', function(done){
                if(url && request){
                    var reqUrl = '/' +  modelPlural + '/consist-101?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            if(res.text){
                                res.text = JSON.parse(res.text);
                                host = res.text.hostname;
                                port = res.text.portNumber;
                                doTestGetById(0, 'consist-101', done);
                            } else {
                                done(new Error("Response doesnt have body in it."));
                            }
                        }
                    });
                } else {
                    done(new Error("Proxy url not provided, couldn't construct the request object."));
                }               
            });
            it('consist-201', function(done){
                if(url && request){
                    var reqUrl = '/' +  modelPlural + '/consist-201?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            if(res.text){
                                res.text = JSON.parse(res.text);
                                host = res.text.hostname;
                                port = res.text.portNumber;
                                doTestGetById(0, 'consist-201', done);
                            } else {
                                done(new Error("Response doesnt have body in it."));
                            }
                        }
                    });
                } else {
                    done(new Error("Proxy url not provided, couldn't construct the request object."));
                }
            });
            function doTestGetById(count, id, done){
                if(count < numberOfReqs){
                    var reqUrl = '/' +  modelPlural + '/'+id+'?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            expect(res.text).not.to.be.null;
                            res.text = JSON.parse(res.text);
                            expect(res.text.hostname).to.be.equal(host);
                            expect(res.text.portNumber).to.be.equal(port);
                        
                            doTestGetById(count + 1, id, done);
                        }
                    });
                } else {
                    done();
                }
            }
        });
        describe('Update Attributes', function(){
            it('test', function(done){
                var acnt1Host, acnt1Port, acnt2Host, acnt2Port, urlPath = 'customUpdateAttributes';
                if(url && request){
                    var reqUrl = '/' +  modelPlural + '/'+ urlPath +'?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            if(res.text){
                            res.text = JSON.parse(res.text);
                                if(res.text.acct1 && res.text.acct2) {
                                    acnt1Host = res.text.acct1.hostname;
                                    acnt1Port = res.text.acct1.portNumber;
                                    acnt2Host = res.text.acct2.hostname;
                                    acnt2Port = res.text.acct2.portNumber;
                                    doTestUpdate(0, done);
                                } else {
                                    done(new Error("Response is not in proper format as expected."));
                                }
                            } else {
                                done(new Error("Response doesnt have body."));
                            }
                        }
                    });
                } else {
                    done(new Error("Proxy url not provided, couldn't construct the request object."));
                }
                function doTestUpdate(count, done){
                if(count < numberOfReqs){
                    var reqUrl = '/' +  modelPlural + '/'+ urlPath +'?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            expect(res.text).not.to.be.null;
                            res.text = JSON.parse(res.text);
                            expect(res.text.acct1).not.to.be.null;
                            expect(res.text.acct2).not.to.be.null;
                            expect(res.text.acct1.hostname).to.be.equal(acnt1Host);
                            expect(res.text.acct1.portNumber).to.be.equal(acnt1Port);
                            expect(res.text.acct2.hostname).to.be.equal(acnt2Host);
                            expect(res.text.acct2.portNumber).to.be.equal(acnt2Port);
                            doTestUpdate(count + 1, done);
                        }
                    });
                } else {
                    done();
                }
            }
            })
        });
        describe('Upsert', function(){
            it('test', function(done){
                var acnt1Host, acnt1Port, acnt2Host, acnt2Port, urlPath = 'customUpsert';
                if(url && request){
                    var reqUrl = '/' +  modelPlural + '/'+ urlPath +'?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            if(res.text){
                                res.text = JSON.parse(res.text);
                                if(res.text.acct1 && res.text.acct2) {
                                    acnt1Host = res.text.acct1.hostname;
                                    acnt1Port = res.text.acct1.portNumber;
                                    acnt2Host = res.text.acct2.hostname;
                                    acnt2Port = res.text.acct2.portNumber;
                                    doTestUpsert(0, done);
                                } else {
                                    done(new Error("Response is not in proper format as expected."));
                                }
                            } else {
                                done(new Error("Response doesnt have body."));
                            }
                        }
                    });
                } else {
                    done(new Error("Proxy url not provided, couldn't construct the request object."));
                }
                function doTestUpsert(count, done){
                if(count < numberOfReqs){
                    var reqUrl = '/' +  modelPlural + '/'+ urlPath +'?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            expect(res.text).not.to.be.null;
                            res.text = JSON.parse(res.text);
                            expect(res.text.acct1).not.to.be.null;
                            expect(res.text.acct2).not.to.be.null;
                            expect(res.text.acct1.hostname).to.be.equal(acnt1Host);
                            expect(res.text.acct1.portNumber).to.be.equal(acnt1Port);
                            expect(res.text.acct2.hostname).to.be.equal(acnt2Host);
                            expect(res.text.acct2.portNumber).to.be.equal(acnt2Port);
                            doTestUpsert(count + 1, done);
                        }
                    });
                } else {
                    done();
                }
            }
            })
        });
        function getRequest(reqUrl, cb){
            request
                .get(reqUrl)
                .set('tenant_id', 'test-tenant')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err, response){
                    cb(err, response);
                });
        }
        it('Get Report', function(done){
            var acnt1Host, acnt1Port, acnt2Host, acnt2Port;
            if(url && request){
                var reqUrl = '/' +  modelPlural + '/report?access_token='+access_token;
                getRequest(reqUrl, function(err, res){
                    if(err){
                        done(err);
                    } else {
                        if(res.text){
                           res.text = JSON.parse(res.text);
                            if(res.text.acct1 && res.text.acct2) {
                                acnt1Host = res.text.acct1.hostname;
                                acnt1Port = res.text.acct1.portNumber;
                                acnt2Host = res.text.acct2.hostname;
                                acnt2Port = res.text.acct2.portNumber;
                                doTestReport(0, done);
                            } else {
                                done(new Error("Response is not in proper format as expected."));
                            }
                        } else {
                            done(new Error("Response doesnt have body."));
                        }
                    }
                });
            } else {
                done(new Error("Proxy url not provided, couldn't construct the request object."));
            }
            function doTestReport(count, done){
                if(count < numberOfReqs){
                    var reqUrl = '/' +  modelPlural + '/report?access_token='+access_token;
                    getRequest(reqUrl, function(err, res){
                        if(err){
                            done(err);
                        } else {
                            expect(res.text).not.to.be.null;
                            res.text = JSON.parse(res.text);
                            expect(res.text.acct1).not.to.be.null;
                            expect(res.text.acct2).not.to.be.null;
                            expect(res.text.acct1.hostname).to.be.equal(acnt1Host);
                            expect(res.text.acct1.portNumber).to.be.equal(acnt1Port);
                            expect(res.text.acct2.hostname).to.be.equal(acnt2Host);
                            expect(res.text.acct2.portNumber).to.be.equal(acnt2Port);
                            doTestReport(count + 1, done);
                        }
                    });
                } else {
                    done();
                }
            }
        });
    });
    describe('With Programmatic Api', function() {
        //this.timeout(10000);
    });
    after('', function(done) {
        done();
    });
});