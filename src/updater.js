var fs = require("fs");
var utils = require('./utils');
var fetcher = require('./fetcher');
var logger = require('./logger');

var updater = {
    config: false,

    update: function(resources) {
    	for (var resource in resources) {
    		var page = new WebPage();
    		page.open(resource.url, function (status) {
        	    if (status !== 'success') {
        	    	logger.info('FAIL to load the resource : ' + resource.name);
        	    }
        	    else {
        	    	fs.write(resource.dir + fs.separator + resource.name, page.content, "w");
        	    }
    		});
    	}
    },

    run: function() {
    	this.config = JSON.parse(fs.read("conf/updater.config.json"));

    	var page = new WebPage();

    	page.onResourceRequested = function (request) {
    		logger.info('Request ' + JSON.stringify(request, undefined, 4));
    	};

    	page.onResourceReceived = function (response) {
    		logger.info('Receive ' + JSON.stringify(response, undefined, 4));
    	};

    	page.open(this.config.url, function (status) {
    	    if (status !== 'success') {
    	    	logger.info('FAIL to load the address');
    	    }
    	    else {
    	    	var result = JSON.parse(page.content);

    	    	if (result.version > updater.config.version) {
        	    	updater.update(result.resources);
    	    	}
    	    }

    	    // phantom.exit();
    	});
    },
};

updater.run();
