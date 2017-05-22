/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var dbs = db.getMongo().getDBNames();
for (var i in dbs) {
    db = db.getMongo().getDB(dbs[i]);
    var name = db.getName();
    if (name !== 'local' && name !== 'admin') {
        print('dropping db ' + db.getName());
        db.dropDatabase();
    }
}