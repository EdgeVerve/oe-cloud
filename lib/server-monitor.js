var EventEmitter = require('events');
var emitter = new EventEmitter();
module.exports.eventEmitter = emitter;

var time1; var time2; var currentLag;
var legacy = {
  'measurements': new Array(20),
  'tendency': null,
  'value': null
};

module.exports.init = () => {
  console.log('At init');
  // setInterval(getEventLoopLegacy, 5 * 1000);
  getEventLoopLegacy();
};

var getEventLoopLegacy = () => {
  time1 = new Date().getTime();
  setTimeout(() => {
    time2 = new Date().getTime();
    currentLag = time2 - time1 - 10;
    legacy.measurements.push(currentLag);
    legacy.measurements = legacy.measurements.slice(-15);
    legacy.value = (1 / 3) * legacy.value + (2 / 3) * currentLag;

    console.log('legacy value: ' + legacy.value);
  }, 10);
};

var reportHighLoad = () => {
  console.log('At reportHighLoad');
  emitter.emit('server_load_60%');
  // setTimeout(reportLowLoad, 5 * 1000);
};

var reportLowLoad = () => {
  console.log('At reportLowLoad');
  emitter.emit('server_load_40%');
  // setTimeout(reportHighLoad, 20 * 1000);
};
