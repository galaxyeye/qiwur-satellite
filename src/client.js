var fs = require("fs");
var system = require("system");
var sysconfig = require('./lib/config');
var utils = require('./lib/utils');
var logger = require('./lib/logger');
var fetcher = require('./fetcher').create();

var httpClient = {
    config: false,

    run: function () {
    	if (system.args.length < 2) {
    		console.log("usage : phantomjs [options] client.js url");
    		phantom.exit(0);
    	}

    	this.config = sysconf.loadConfig().fetcher;
    	this.config.url = system.args[1];

    	fetcher.fetch(this.config.url, this.config, function(response, page) {
    		var file = utils.getTemporaryFile(response.url);
    		fs.write(file, page.content, 'w');

    		console.log("full page content has been saved in file : " + file);
        	phantom.exit();
    	});
    },
};

httpClient.run();
