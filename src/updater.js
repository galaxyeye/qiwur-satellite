var fs = require("fs");
var utils = require('./lib/utils');
var logger = require('./lib/logger');
var fetcher = require('./fetcher');

var DefaultUpdateTimeout = 5 * 60 * 1000; // 5 min
var updated = false;

var updater = {
    config: false,
    resourceCount : 0,
    updatedResources : 0,

    update: function(resources) {
    	this.resourceCount = resources.length;

    	for (var resource in resources) {
    		var page = new require('webpage').create();
    		page.open(resource.url, function (status) {
        	    if (status !== 'success') {
        	    	logger.error('FAIL to load the resource : ' + resource.name);
        	    	phantom.exit();
        	    }
        	    else {
        	    	fs.write(resource.dir + fs.separator + resource.name, page.content, "w");
        	    	++updatedResources;
        	    }
    		});
    	}

        var waitfor = require('./lib/waitfor').create(
        	function() {
        		return updatedResources >= resourceCount;
        	},
        	function() {
    	    	logger.info('update successful, updated resources : ' + JSON.stringify(resources));
    	    	phantom.exit();
        	},
        	function() {
        		logger.error('failed to update resources');
        		phantom.exit();
        	},
        	DefaultUpdateTimeout);

        waitfor.startTimer();
    },

    run: function() {
    	this.config = JSON.parse(fs.read("conf/updater.config.json"));

    	var page = new require('webpage').create();

    	page.onResourceRequested = function (request) {
    		logger.debug('Request ' + JSON.stringify(request, undefined, 4));
    	};

    	page.onResourceReceived = function (response) {
    		logger.debug('Receive ' + JSON.stringify(response, undefined, 4));
    	};

    	page.open(this.config.url, function (status) {
    	    if (status !== 'success') {
    	    	logger.error('update failed');
    	    }
    	    else {
    	    	var result = JSON.parse(page.content);

    	    	if (result.version > updater.config.version) {
        	    	updater.update(result.resources);
    	    	}
    	    	else {
    	    		logger.info('every thing is up to date');
    	    	}
    	    }

    	    updated = true;
    	});
    },
};

updater.run();

var tick = 0;
setInterval(function() {
    if (updated || ++tick > 30) {
    	phantom.exit(0);
    }
}, 2000);
