var fs = require('fs');

var injs = 'module.exports=function(t){t.prototype.atomicTypes=["DEBIT"],t.prototype.nonAtomicTypes=["CREDIT"],t.prototype.associatedModels=["InventoryTransaction"],t.prototype.MAX_RETRY_COUNT=20,t.prototype.validateCondition=function(t,o){if("DEBIT"===o.instructionType)return t.quantity>=o.payload.value},t.prototype.atomicInstructions=function(t,o){if("DEBIT"===o.instructionType)return t.quantity=t.quantity-o.payload.value,t},t.prototype.nonAtomicInstructions=function(t,o){if("CREDIT"===o.instructionType)return t.quantity=t.quantity+o.payload.value,t},t.prototype.processPendingMessage=function(t,o){return"CREDIT"===t.instructionType?o.quantity+=t.payload.value:"DEBIT"===t.instructionType&&(o.quantity-=t.payload.value),o}};';

fs.writeFile("common/models/framework/inventory.js", injs, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

var invjson = '{"name":"Inventory","base":"BaseActorEntity","plural":"Inventories","idInjection":true,"options":{"validateUpsert":true},"cacheable":true,"properties":{"location":{"type":"string","compositeId":1},"skuCode":{"type":"string","compositeId":2},"status":{"type":"string"}},"validations":[],"relations":{"items":{"type":"embedsMany","model":"SkuInventory","property":"skuInventory","options":{"forceId":true}}},"acls":[{"permission":"ALLOW","principalType":"ROLE","principalId":"$everyone","property":"*"},{"permission":"ALLOW","principalType":"ROLE","principalId":"admin","property":"*"}],"methods":{},"mixins":{"GravityCompositeIdMixin":true,"GravityPaginateMixin":true,"OrganisationFilterMixin":true}}';

fs.writeFile("common/models/framework/inventory.json", invjson, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

var inTrans = 'module.exports=function(InventoryTransaction){InventoryTransaction.prototype.performBusinessValidations=function(cb){cb();};};';

fs.writeFile("common/models/framework/inventoryTransaction.js", inTrans, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 

var invTransJson = '{"name":"InventoryTransaction","base":"BaseJournalEntity","idInjection":true,"properties":{},"validations":[],"relations":{},"acls":[],"methods":{}}';

fs.writeFile("common/models/framework/inventoryTransaction.json", invTransJson, function(err) {
    if(err) {
        return process.exit(-1);
    }
}); 


fs.writeFileSync('server/model-config.orig', fs.readFileSync('server/model-config.json'));

fs.readFile('server/model-config.json', 'utf8', function(oErr, sText) {
    //console.log(sText);
    var r1 = sText.substr(sText.length - 4, sText.length - 1);
    var re = new RegExp(r1,"g");
     var result = sText.replace(r1, '},"Inventory": {"public": true,"dataSource": "db"},"InventoryTransaction": {"public": true,"dataSource": "db"}}');
     fs.writeFile('server/model-config.json', result, function (err) {
        if(err) {
            return process.exit(-1);
        }
    });
});