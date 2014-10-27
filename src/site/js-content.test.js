var config = require('./../config');
var casper = require("casper").create();
var utils = require('./../utils');
var fs = require("fs");

//casper.options = {
//	pageSettings: {
//	    loadImages:  false,         // The WebPage instance used by Casper will
//	    loadPlugins: false          // use these settings
//	},
//	logLevel: "debug",              // Only "info" level messages will be logged
//	verbose: true                   // log messages will be printed out to the console
//};

casper.options.logLevel = "debug";
casper.options.verbose = true;

casper.on('resource.requested', function(requestData, networkRequest) {
	// this.echo("requested : " + requestData.url);

//	networkRequest.setHeader("Accept-Charset", "gb2312");
//	networkRequest.setHeader("Accept-Language", "zh-CN");

	if (requestData.url.indexOf(".js") !== -1) {
//		this.echo("request headers : " + JSON.stringify(request.headers));
	}

	if (requestData.url.indexOf("calendar.js") !== -1) {
//		networkRequest.abort();
	}

	if (requestData.url.indexOf("ClosePage.html") !== -1) {
		networkRequest.abort();
	}
});

casper.on('resource.received', function(response) {
	// this.echo("received : " + response.url);

	if (response.url.indexOf(".js") !== -1) {
//		this.log("response : " + JSON.stringify(response), "debug");


	}
});

var url = "http://hrtest00.many-it.com/qhzjj/Web/js/calendar.js";

casper.start().then(function() {
    this.open(url, {
        method: 'get',
        headers: {
            'Accept-Charset' : 'gb2312',
            'Accept-Language' : 'zh-CN'
        }
    });
});

casper.then(function() {
	var path = "output/calendar.js";
	fs.open(path, {
		opts : {
			'mode' : 'w',
			'charset' : 'gbk'
		}
	});
//	fs.write(this.getPageContent());
//	this.echo("js saved in " + path);
});

casper.run(function() {
	this.exit();
});
