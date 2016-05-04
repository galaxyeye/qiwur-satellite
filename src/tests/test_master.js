var utils = require('./utils');
var fs = require("fs");
var logger = require('./logger');
var page = require('webpage').create();

var data = "<html>" +
		"<head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head>" +
		"<title>great</title><body>" +
		"<div><a>http://item.jd.com/国务院.html?a=1&b=2</a>会议指出，今年7月国务院推出一系列措施以来，有关方面做了大量工作</div>" +
		"</body></html>";

// var file = utils.getTemporaryFile("http://list.jd.com/list.html?cat=670%2C671%2C672&page=11&JL=6_0_0");
data = fs.read("/home/vincent/workspace/satellite/output/1.html");

var pageSettings = {
	loadImages : false,
	javascriptEnabled : false
};

var openOptions = {
	operation : "PUT",
	encoding : "utf8",
	headers : {
		"Content-Type" : "text/html; charset=utf-8"
	},
	data : data
};

var customHeaders = {
    'Q-Version' : 0.80,
    'Q-Username' : 'username',
    'Q-Password' : 'password',
    'Q-Queue-ID' : 'fetchItem.queueID',
    'Q-Item-ID' : 'fetchItem.itemID',
    'Q-Status-Code' : 'response.status',
    'Q-Checksum' : 'md5.hex_md5(content)',
    'Q-Url' : 'fetchItem.url',
    'Q-Response-Time' : 'elapsed'
};

page.settings = pageSettings;
page.customHeaders = customHeaders;

page.onResourceReceived = function (response) {
    if (response.stage == 'end') {
    	console.log("---------------------------");
    	console.log(JSON.stringify(response.url));
    	console.log(JSON.stringify(response.contentType));
    	console.log(JSON.stringify(response.headers));
    }
};

page.open("http://master:8182/proxy/echo", openOptions, function(status) {
	if (status !== 'success') {
		console.log('FAIL to submit, status ' + status);
	} else {
		console.log('submitted');
	}

    // for debug
    // fs.write("output/20/1.html", page.content, 'w');
	console.log(page.content);

    phantom.exit(0);
});
