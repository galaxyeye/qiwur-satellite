var fs = require("fs");
var system = require("system");
var utils = require('./utils');
var fetcher = require('./fetcher').create();
var logger = require('./logger');

var httpClient = {
    config: false,

    run: function () {
    	if (system.args.length < 2) {
    		console.log("usage : phantomjs [options] client.js url");
    		phantom.exit(0);
    	}

    	this.config = utils.loadConfig().fetcher;
    	this.config.url = system.args[1];

		console.log("load url : " + this.config.url);
    	
    	fetcher.fetch(this.config.url, this.config, function(response, page) {
    		file = utils.getTemporaryFile(response.url);
    		fs.write(file, page.content, 'w');

    		console.log("full page content has been saved in file : " + file);
        	phantom.exit();
    	});
    },
};

httpClient.run();
