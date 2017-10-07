/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

console.log('preperation finished');

/*var fs = require('fs');

var testNoteJs = 'var async = require('+'async'+'); module.exports = function (Model) { Model.prototype.changeTitle = function (title, ctx, monitoringId, version, callback) { Model.find({}, ctx, (err, notes) => { if (err) { return callback(err); } async.each(notes, function (note, cb) { note.updateAttribute(' + 'title' + ', title, ctx, function (err) { if (err) { console.log(err); } cb(); }); }, function (err) { callback(err, monitoringId, version); }); }); }; };';

fs.writeFile("common/models/framework/test-note.js", testNoteJs, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

var testNoteJson = '{ "name": "TestNote", "base" : "BaseEntity", "strict" : false, "properties": { "title": { "type": "string" }, "content": { "type": "string" } } }';

fs.writeFile("common/models/framework/test-note.json", testNoteJson, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

fs.writeFileSync('server/model-config.orig', fs.readFileSync('server/model-config.json'));

fs.readFile('server/model-config.json', 'utf8', function(oErr, sText) {
    var r1 = sText.substr(sText.length - 4, sText.length - 1);
    var re = new RegExp(r1,"g");
     var result = sText.replace(r1, '},"TestNote": {"public": true,"dataSource": "db"}}');
     fs.writeFile('server/model-config.json', result, function (err) {
        if(err) {
            return process.exit(-1);
        }
    });
});*/