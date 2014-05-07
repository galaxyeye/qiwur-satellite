var utils = require('./utils');
var logger = require('./logger');

var reported = false;

var reporter = {

    run: function () {
        var config = utils.loadConfig();
        var data = JSON.stringify(config);

        var page = new require('webpage').create();
        page.customHeaders = { 
            'Content-Type': 'application/json' 
        };
        page.open(config.reporter.url, 'POST', data, function (status) {
            if (status !== 'success') {
                logger.error('FAIL to load the address');
            }
            else {
                logger.info('satellite status reported');
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
