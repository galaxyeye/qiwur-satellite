var fs = require('fs');
var FlushCachePeriod = 500;
var DefaultLevel = 'info';
var ConfigLevel = 'debug';

var loggerLevel = {
	'trace' : 0,
	'debug' : 1,
	'info' : 2,
	'warn' : 3,
	'error' : 4,
	'fatal' : 5
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

	write : function(file, msg) {
		msg = "[" + this.getTime() + "]" + " " + msg + "\n";
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

	warn : function(msg) {
		this.log(msg, "warn");
	},

	info : function(msg) {
		this.log(msg, "info");
	},

	error : function(msg) {
		this.log(msg, "error");
	},

	fatal : function(msg) {
		this.log(msg, "fatal");
	},

	log: function(msg, level) {
		if (!this.config) {
	        this.config = utils.loadConfig().logger;
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

		loggerImpl.write(file, msg);
	},

	close : function () {
		loggerImpl.close();
	},
};

loggerImpl.run();

for (var f in logger) {
	exports[f] = logger[f];
}
