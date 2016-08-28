var utils = require('../utils');
var logger = require('../logger');
var webpage = new require('webpage').create();

var requested = false;

var queueID = 1;
var itemID = 1;
var targetUrl = "http://list.yhd.com/c31904-0-62543/k%E8%9C%82%E8%9C%9C/?tc=3.0.9.31904.1&tp=51.%E8%9C%82%E8%9C%9C.123.0.1.KYvYl5I";

var url = "http://localhost:8183/fetch/submit/" + queueID + "/" + itemID;

var result = {
	statusCode : 200,
	headers : [],
	content : ""
};

var fetcher = {

    run: function () {
        webpage.customHeaders = {
            'Content-Type': 'application/json'
        };
        webpage.open(url, 'PUT', JSON.stringify(query), function (status) {
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

fetcher.run();

var tick = 0;
setInterval(function() {
    if (requested || ++tick > 2) {
        phantom.exit(0);
    }
}, 5000);
