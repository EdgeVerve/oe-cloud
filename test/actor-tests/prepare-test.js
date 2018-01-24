/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var fs = require('fs');

fs.readFile('server/model-config.json', 'utf8', function(oErr, sText) {
    var r1 = sText.substr(sText.length - 4, sText.length - 1);
    var re = new RegExp(r1,"g");
     var result = sText.replace(r1, '},\n\t"Inventory": {"public": true,"dataSource": "db"},\n\t"InventoryTransaction": {"public": true,"dataSource": "db"}\n}');
     fs.writeFile('test/actor-tests/test-files/server/model-config.json', result, function (err) {
        if(err) {
            return process.exit(-1);
        }
    });
});
