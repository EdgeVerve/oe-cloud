const chalk = require('chalk');

describe(chalk.blue('Cluster tests'), function(){
  it('should simply run awesomly', done => {
    setTimeout(done, 5000);
  });
});
