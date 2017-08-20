var fs = require('fs');

var notejs = 'module.exports = function (Model) {Model.prototype.remote2 = function (cb) {cb(null, {message: "remote 2 ok"});};Model.remoteMethod("remote2", {isStatic: false,description: "remote2",accessType: "READ",accepts: [],http: {verb: "GET",path: "/remote2"},returns: {type: "object",root: true}});Model.observe("after save", function (ctx, next) {var err = new Error("Note after save fail");return next(err);});};';

fs.writeFile("common/models/framework/note.js", notejs, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

var notejson = '{"name": "Note","base" : "BaseEntity","strict" : false,"properties": {"title": {"type": "string"},"content": {"type": "string"}}}';

fs.writeFile("common/models/framework/note.json", notejson, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

fs.writeFileSync('server/model-config.orig', fs.readFileSync('server/model-config.json'));

fs.readFile('server/model-config.json', 'utf8', function(oErr, sText) {
    //console.log(sText);
    var r1 = sText.substr(sText.length - 4, sText.length - 1);
    var re = new RegExp(r1,"g");
     var result = sText.replace(r1, '},"Note": {"public": true,"dataSource": "db"}}');
     fs.writeFile('server/model-config.json', result, function (err) {
        if(err) {
            return process.exit(-1);
        }
    });
});
