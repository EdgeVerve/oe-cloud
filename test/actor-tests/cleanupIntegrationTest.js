var fs = require('fs');

fs.unlink('common/models/framework/inventory.js',function(err){
        if(err) {
        return process.exit(-1);
    }
});  

fs.unlink('common/models/framework/inventory.json',function(err){
        if(err) {
        return process.exit(-1);
    }
});  

fs.unlink('common/models/framework/inventoryTransaction.js',function(err){
        if(err) {
        return process.exit(-1);
    }
});  

fs.unlink('common/models/framework/inventoryTransaction.json',function(err){
        if(err) {
        return process.exit(-1);
    }
});  

fs.writeFileSync('server/model-config.json', fs.readFileSync('server/model-config.orig'));

fs.unlink('server/model-config.orig',function(err){
        if(err) {
        return process.exit(-1);
    }
});  