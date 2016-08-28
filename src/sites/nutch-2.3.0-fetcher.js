var utils = require('../utils');
var logger = require('../logger');
var webpage = new require('webpage').create();

var requested = false;
var url = "http://localhost:8182/exec/fetch";
var query = ['a', 'b', 'c'];

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
