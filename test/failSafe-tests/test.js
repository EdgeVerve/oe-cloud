var exec = require('child_process').exec;

var commands = [
    'docker stack ps mayademo'
]

commands.forEach(cmd => {
    exec(array[index++], function(err, stdout) {
        console.log(stdout);
    })
})
