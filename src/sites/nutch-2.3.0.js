var utils = require('../utils');
var logger = require('../logger');
var webpage = new require('webpage').create();

var requested = false;
var dbUrl = "http://www.qiwur.com:8182/db";
var query = {
	batchId : "1413171369-414566065",
	startKey : null, 
	endKey : null, 
	fields : ['baseUrl','batchId','title']
};

var dbReader = {

    run: function () {
        webpage.customHeaders = {
            'Content-Type': 'application/json'
        };
        webpage.open(dbUrl, 'POST', JSON.stringify(query), function (status) {
            if (status !== 'success') {
                console.log('FAIL to load the address');
            }
            else {
                console.log(webpage.content);
            }

            webpage.close();

            requested = true;
        });
    },
};

dbReader.run();

var tick = 0;
setInterval(function() {
    if (requested || ++tick > 2) {
        phantom.exit(0);
    }
}, 5000);
