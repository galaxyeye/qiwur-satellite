var fs = require('fs');
var system = require('system');

var FlushCachePeriod = 1000;
var DefaultLevel = 'info';
var ConfigLevel = 'debug';

var loggerLevel = {
	'trace' : 1,
	'debug' : 2,
	'info' : 3,
	'warn' : 4,
	'error' : 5,
	'fatal' : 6
};

var loggerImpl = {

	interval : null,

	cache : [],

	getTime : function() {
		var d = new Date();
		return d.getUTCMonth() + "/" + d.getUTCDate() + " "
			+ d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds() 
			+ "." + d.getUTCMilliseconds();
	},

	write : function(file, msg, level) {
		msg = this.getTime() + " [" + level + "] " + system.pid + " " + msg + "\n";
		this.cache.push({"file" : file, "msg" : msg});
	},

	run : function() {
		this.interval = setInterval(function() {
			loggerImpl.cache.reverse();
			while (loggerImpl.cache.length > 0) {
				var item = loggerImpl.cache.pop();
				fs.write(item.file, item.msg, 'a');
			}
		}, FlushCachePeriod);
	},

	close : function () {
		clearInterval(this.interval);
	},
};

var logger = {
	config : null,

	logLevel: DefaultLevel,

	trace: function(msg) {
		this.log(msg, "trace");
	},

	debug: function(msg) {
		this.log(msg, "debug");
	},

	info : function(msg) {
		this.log(msg, "info");
	},

	warn : function(msg) {
		this.info(msg);
		this.log(msg, "warn");
	},

	error : function(msg) {
		this.info(msg);
		this.log(msg, "error");
	},

	fatal : function(msg) {
		this.info(msg);
		this.log(msg, "fatal");
	},

	log: function(msg, level) {
		if (!this.config) {
	        this.config = require('./config').loadConfig().logger;
	        this.logLevel = this.config.logLevel;
		}

		if (!level || !loggerLevel[level]) {
			level = this.logLevel ? this.logLevel : DefaultLevel;
		}

		if (loggerLevel[level] < loggerLevel[ConfigLevel]) {
			return;
		}

		file = utils.logDir() + fs.separator + new Date().getDate() + fs.separator + 
			"satellite." + level + ".log";

		loggerImpl.write(file, msg, level);
	},

	close : function () {
		loggerImpl.close();
	},
};

loggerImpl.run();

for (var f in logger) {
	exports[f] = logger[f];
}
