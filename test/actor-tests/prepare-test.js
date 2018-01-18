/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var fs = require('fs');

/* var inventoryJs = 'module.exports = function (Inventory) { Inventory.prototype.atomicTypes = ["DEBIT"];Inventory.prototype.nonAtomicTypes = ["CREDIT"];Inventory.prototype.associatedModels = ["InventoryTransaction"];Inventory.prototype.stateObj = {quantity: 0};Inventory.prototype.MAX_RETRY_COUNT = 20;Inventory.prototype.validateCondition = function (actor, activity) {if (activity.instructionType === "DEBIT") {return actor.quantity >= activity.payload.value;}};Inventory.prototype.atomicInstructions = function (actor, activity) {if (activity.instructionType === "DEBIT") {actor.quantity = actor.quantity - activity.payload.value;return actor;}};Inventory.prototype.nonAtomicInstructions = function (actor, activity) {if (activity.instructionType === "CREDIT") {actor.quantity = actor.quantity + activity.payload.value;return actor;}};Inventory.prototype.processPendingMessage = function (message, actor) {if (message.instructionType === "CREDIT") {actor.quantity +=  message.payload.value;} else if (message.instructionType === "DEBIT") {actor.quantity -=  message.payload.value;}return actor;};};';
var inventoryJson = '{"name": "Inventory","base": "BaseActorEntity","strict": false,"plural": "Inventories","idInjection": true,"options": {"validateUpsert": true},"cacheable": true,"properties": {"location": {"type": "string"},"skuCode": {"type": "string"},"status": {"type": "string"}},"validations": [],"methods": {}}';
var inventoryTransactionJs = 'module.exports = function (InventoryTransaction) {InventoryTransaction.prototype.performBusinessValidations = function (options, cb) {cb();};};';
var inventoryTransactionJson = '{"name": "InventoryTransaction","base": "BaseJournalEntity","idInjection": true,"properties": { },"validations": [],"relations": {},"acls": [],"methods": {}}';

fs.writeFile("test/actor-tests/test-files/common/models/framework/inventory.js", inventoryJs, function(err) {
    if(err) {
        return process.exit(-1);
    }
});
fs.writeFile("test/actor-tests/test-files/common/models/framework/inventory.json", inventoryJson, function(err) {
    if(err) {
        return process.exit(-1);
    }
});
fs.writeFile("test/actor-tests/test-files/common/models/framework/inventoryTransaction.js", inventoryTransactionJs, function(err) {
    if(err) {
        return process.exit(-1);
    }
});
fs.writeFile("test/actor-tests/test-files/common/models/framework/inventoryTransaction.json", inventoryTransactionJson, function(err) {
    if(err) {
        return process.exit(-1);
    }
});  */

// fs.writeFileSync('test/actor-tests/test-files/server/model-config.orig', fs.readFileSync('server/model-config.json'));

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
