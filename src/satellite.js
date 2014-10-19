var system = require("system");
var fs = require("fs");
var utils = require('./utils');
var logger = require('./logger');
var config = require('./config').loadConfig().fetchController;
var pageFetcher = require('./fetcher').create();
var scheduleUrl = config.scheduleUrl + "/" + config.scheduleCount;

var satellite = {

	status : "ready",

	run : function() {
		setInterval(function() {
			if (satellite.status == "ready") {
				satellite.schedule(scheduleUrl);
			}
	    }, 2000);
	},

    schedule : function (scheduleUrl) {
    	var page = require('webpage').create();

    	var options = {
    		headers : {
    			"Accept" : "application/json"
    		}
    	};

    	var fetchItems = null;

    	page.open(scheduleUrl, options, function (status) {
            if (status !== 'success') {
            	page.close();
                satellite.status = "ready";
            	return;
            }

            satellite.status = "scheduled";

            console.log(page.plainText);

    		var fetchItems = JSON.parse(page.plainText);

    		for (var i = 0; i < fetchItems.length; ++i) {
    			satellite.fetch(fetchItems[i]);
    		}

    		page.close();
        });
    },

    fetch : function(fetchItem) {
        console.log("fetch item : " + JSON.stringify(fetchItem));

		pageFetcher.fetch(fetchItem.url, config, function(response, page) {
			var fetchResult = {
				queueID : fetchItem.queueID,
				itemID : fetchItem.itemID,
				headers : response.headers,
				content : page.content
			};
			satellite.submit(fetchResult);
		});
    },

    submit: function (fetchResult) {
    	var page = require('webpage').create();

        page.customHeaders = {
            'Content-Type': 'application/json'
        };

        console.log("submit " + config.submitUrl);

        page.open(config.submitUrl, 'PUT', JSON.stringify(fetchResult), function (status) {
            if (status !== 'success') {
                console.log('FAIL to submit the task');
            }

            satellite.status = "ready";

            page.close();
        });
    }
};

satellite.run();
