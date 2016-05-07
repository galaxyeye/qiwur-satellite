var fs = require("fs");
require(fs.absolute("bootstrap"));

var utils = vendor('sutils');
var logger = vendor('logger');

var fs = require("fs");
var system = require("system");
var fetcher = require('./fetcher').create();

var httpClient = {
    config: false,

    run: function () {
    	if (system.args.length < 2) {
    		console.log("usage : phantomjs [options] client.js url");
    		phantom.exit(0);
    	}

    	this.config = window.config.loadConfig().fetcher;
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
