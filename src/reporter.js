var utils = require('./utils');
var logger = require('./logger');

var reporter = {

    run: function () {
        var config = utils.loadConfig();
        var data = JSON.stringify(config);

    	var page = new require('webpage').create();
    	page.open(config.reporter.url, 'POST', data, function (status) {
    	    if (status !== 'success') {
    	        logger.error('FAIL to load the address');
    	    }
    	    else {
    	    	logger.info('satellite status reported');
    	    	// logger.info('response : ' + page.content);
    	    }
    	});
    },
};

reporter.run();

setTimeout(function () {
	logger.error('reporter seems failed to report');

	phantom.exit();
}, 2 * 60 * 1000);
