var fs = require('fs');

var loggerImpl = {

	interval : null,

	cache : [],

	write : function(file, msg) {
		this.cache.push({"file" : file, "msg" : msg + "\n"});
	},

	run : function() {
		this.interval = setInterval(function() {
			while (loggerImpl.cache.length > 0) {
				var item = loggerImpl.cache.pop();
				fs.write(item.file, item.msg, 'a');
			}
		}, 250);
	},

	close : function () {
		clearInterval(this.interval);
	},
};

var logger = {
		
	info : function(msg) {
		this.log(msg, "info");
	},

	debug: function(msg) {
		this.log(msg, "debug");
	},

	error : function(msg) {
		this.log(msg, "error");
	},

	log: function(msg, level) {
		if (!level) level = "debug";

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
