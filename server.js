var restify = require('restify');
var sensor = require('node-dht-sensor');
var mongoose = require('mongoose');
var moment = require('moment');
var cronJob = require('cron').CronJob;
var fs = require('fs');
var logModule = require('log');

process.env.NODE_CONFIG_DIR = __dirname +  '/config';
var config = require('config');

var logLevel = config.get('app.system.logLevel');
var mongodbHost = config.get('app.mongo.host');
var mongodbPort = config.get('app.mongo.port');
var mongodbName = config.get('app.mongo.dbName');
var serverHost = config.get('app.server.host');
var serverPort = config.get('app.server.port');
var serverName = config.get('app.server.name');
var dhtSensorType = config.get('app.dhtSensor.type');
var dhtSensorDataWire = config.get('app.dhtSensor.dataWire');

logEntry = new logModule(logLevel, fs.createWriteStream(__dirname + '/logs/app.log'));

mongoose.connect('mongodb://' + mongodbHost + ':' + mongodbPort + '/' + mongodbName + '');

var Schema = mongoose.Schema;

var TLogSchema = new Schema({
  t : Number,
  h : Number,
  date : { type: Date, default: Date.now },
});

var TLogPost = mongoose.model('TLog', TLogSchema);

new cronJob('0 */5 * * * *', function() {
  sensor.read(dhtSensorType, dhtSensorDataWire, function(err, temperature, humidity) {
    if (!err) {
      temp = temperature.toFixed(1);
      humidity = humidity.toFixed(1);
      var log = new TLogPost({ t: temp, h: humidity});
      log.save(function (err) {
        if(err) {
          logEntry.error(err);
        }
        else {
          logEntry.debug("New values of temperature (%s) and humidity (%s) inserted", temp, humidity);
        }
      });
    }
  });
  
  now = moment();
  lt7Day = moment(now).subtract(720, 'hours');
  TLogPost.find({date: { $lt: lt7Day.format() } }).remove().exec(function(error, results) {
    if(!error) {
      logEntry.debug("Records older then 30 days deleted");
    }
    else {
      logEntry.error(err);
    }
  });
}, null, true, 'Europe/Rome');

function getCurrentValues(req, res, next) {
  sensor.read(22, 4, function(err, temperature, humidity) {
    if (!err) {
      var log = {};
      log.temp = temperature.toFixed(1);
      log.humidity = humidity.toFixed(1);
      logEntry.notice("Current values of temperature (%s) and humidity (%s) requested by %s", log.temp, log.humidity, req.connection.remoteAddress);
      res.contentType = 'json';
      res.send(log);
      next();
    }
    else {
      logEntry.error(err);
    }
  });
}

function computeStatistics(results, interval) {
  var r = [];
  var delta = 0;
  var t = 0;
  var h = 0;
  var sample = 0;
  
  if(interval == 6) sample = 4;
  else if(interval == 24) sample = 12;
  else if (interval == 189) sample = 60;
  else sample = 288;
  
  for (i = 0; i < results.length; i++) {
    t += results[i].t;
    h += results[i].h;
    delta++;    
    if(delta == sample) {
      r.push({t : (t/sample).toFixed(1), h : (h/sample).toFixed(1), date : results[i-(sample/2)].date });
      delta = 0;
      t = 0;
      h = 0;
    }
  }
  
  return r;
}

function getHistoricalValues(req, res, next) {
  var interval = req.params.interval; 
  now = moment();
  ld = moment(now).subtract(interval, 'hours');
  
  TLogPost.find({date: { $gte: ld.format(), $lt: now.format() } }).batchSize(100000).sort({ date: -1 }).exec(function (error, results){
      if(!error) {
        logEntry.notice("Historical values (period: %s hour/s) requested by %s", interval, req.connection.remoteAddress);
        if(interval != 1) results = computeStatistics(results, interval);
        res.contentType = 'json';
        res.send(results);
        next();
      }
      else {
        logEntry.error(err);
      }
  });
}

var server = restify.createServer();
server.use(restify.CORS());
server.get('/data', getCurrentValues);
server.get('/history/:interval', getHistoricalValues);

server.listen(serverPort, serverHost, function() {
  logEntry.notice('%s listening at %s on port %s', serverName, serverHost, serverPort);
});