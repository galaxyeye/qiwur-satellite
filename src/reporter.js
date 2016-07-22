var fs = require("fs");
var logger = vendor('logger');
var configure = vendor('configure').create();

var reported = false;

/**
 * @deprecated
 * */
var reporter = {

    run: function () {
        var config = configure.loadConfig();

        if (!config.report) {
        	logger.info('report disabled');
        	return;
        }

        var data = JSON.stringify(config);

        var page = new require('webpage').create();
        page.customHeaders = {
            'Content-Type': 'application/json'
        };
        page.open(config.reporter.url, 'POST', data, function (status) {
            if (status !== 'success') {
                logger.error('report failed');
            }
            else {
                logger.info('monitor status reported');
                // console.log(page.content);
                // logger.info('response : ' + page.content);
            }

            page.close();

            reported = true;
        });
    },
};

reporter.run();

var tick = 0;
setInterval(function() {
    if (reported || ++tick > 2) {
        phantom.exit(0);
    }
}, 5000);
