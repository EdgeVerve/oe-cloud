/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

var EventEmitter = require('events');
var emitter = new EventEmitter();
module.exports.eventEmitter = emitter;
var logger = require('oe-logger');
var log = logger('server-monitor');
var config = require('../server/config.js');

var time1; var time2; var currentLag;
var load;

const MEASURE_SPACE    = 5;
const SERVER_LOAD_SAMPLE_INTERVAL = config.serverMonitor.serverLoadSampleInterval | 10;
const SERVER_LOAD_DEFINING_INTERVAL  = config.serverMonitor.serverLoadDefiningInterval | SERVER_LOAD_SAMPLE_INTERVAL;


class Average {
  constructor() {
    this.maxSize = 1000;
    this.queue = new Array(this.maxSize);
    this.size = 0;
    this.sum = 0;
    this.h = 0;
    this.t = 0;
  }

  update(val) {
    if (this.size === this.maxSize) {
      this.sum -= this.queue[this.t];
      this.t = this.t === this.maxSize - 1 ? 0 : this.t + 1;
    } else {
      this.size++;
    }
    this.queue[this.h] = val;
    this.h = this.h === this.maxSize - 1 ? 0 : this.h + 1;
    this.sum += val;
  }

  getAvg() {
    return this.sum / this.size;
  }
}

var average = new Average();


module.exports.init = () => {
  setInterval(getEventLoopLegacy, SERVER_LOAD_SAMPLE_INTERVAL);
  setInterval(setServerLoad, SERVER_LOAD_DEFINING_INTERVAL);
};

var getEventLoopLegacy = () => {
  time1 = new Date().getTime();
  setTimeout(() => {
    time2 = new Date().getTime();
    currentLag = time2 - time1 - MEASURE_SPACE;
    average.update(currentLag);
    // console.log('lag,' + currentLag + ',avg,' + average.getAvg());
  }, MEASURE_SPACE);
};

var setServerLoad = () => {
  var avg = average.getAvg();

  switch (true) {
    case (avg < 4):
      reportLoad('LOW');
      break;
    case (avg >= 4 && avg <= 6):
      reportLoad('MEDIUM');
      break;
    case (avg > 6):
      reportLoad('HIGH');
      break;
    default:
      break;
  }
};

var reportLoad = (currentLoad) => {
  if (currentLoad !== load) {
    var msg = 'SERVER_LOAD_' + currentLoad;
    log.info(log.defaultContext, msg);
    emitter.emit(msg);
  }
  load = currentLoad;
};
