var config = require('./../config');
var casper = require("casper").create();
var utils = require('./../utils');
var fs = require("fs");

casper.options.pageSettings.loadImages = false;
casper.options.logLevel = "info";
casper.options.verbose = false;

casper.on('resource.requested', function(requestData, networkRequest) {

//	networkRequest.setHeader("Accept-Charset", "gb2312");
//	networkRequest.setHeader("Accept-Language", "zh-CN");

	if (requestData.url.indexOf(".js") !== -1) {
//		this.log("requested : " + requestData.url, "debug");
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

//		this.log(this.status(true), "debug");
//
//		var path = "output/" + response.url.substr(response.url.lastIndexOf("/") + 1);
//		fs.write(path, this.getPageContent(), 'w');
//		this.echo("js saved in " + path);
	}

//	if (response.url.indexOf("calendar.js") !== -1) {
//		var path = utils.getTemporaryFile(response.url);
//		fs.write(path, this.getHTML(), 'w');
//		this.echo("calendar.js saved in " + path);
//	}
});

casper.on('url.changed', function(targetUrl) {
    // console.log('New URL: ' + targetUrl);
});

var url = "http://hrtest00.many-it.com/qhzjj/Web/index.aspx";

casper.start(url, function() {
	this.fillSelectors('form[action="index.aspx"]', {
		'input[name = txtLoginName ]' : 'admin',
		'input[name = txtPassword ]' : '11',
	}, false);
}).thenClick("#ibnLogin", function() {
	this.echo("ibnLogin clicked");
});

url = 'http://hrtest00.many-it.com/qhzjj/Web/Frame/MainZJJ.aspx';
casper.thenOpen(url, function() {
	var path = utils.getTemporaryFile(url);
	fs.write(path, this.getHTML(), 'w');

	this.echo("MainZJJ.aspx saved in " + path);
});

casper.thenEvaluate(function() {
    var elements = __utils__.findAll('#MainPageFileListOnlyGrid1_dgdFile a');

    var titles = [];
    for (var i = 0; i < elements.length; ++i) {
    	titles.push({
    		"title" : elements[i].getAttribute('title'),
    		"url" : elements[i].href
    	});
    }

    __utils__.echo(JSON.stringify(titles));
});

casper.thenEvaluate(function() {
    var elements = __utils__.findAll('#MainPageFileListOnlyGrid2_dgdFile a');

    var titles = [];
    for (var i = 0; i < elements.length; ++i) {
    	titles.push({
    		"title" : elements[i].getAttribute('title'),
    		"url" : elements[i].href
    	});
    }

    __utils__.echo(JSON.stringify(titles));
});

casper.thenEvaluate(function() {
    var elements = __utils__.findAll('tr.HandledFileStyle');

    var messages = [];
    for (var i = 0; i < elements.length; ++i) {
    	messages.push({
    		"message" : elements[i].textContent.replace(/\s/g, "")
    	});
    }

    __utils__.echo(JSON.stringify(messages));
});

url = 'http://hrtest00.many-it.com/qhzjj/Web/FormFolder/DHJL.aspx?GUID=&RID=2&INFO_ID=14403&VIEW_FLAG=&TIMELIMIT=';
casper.thenOpen(url, function() {
	var path = utils.getTemporaryFile(url);
	fs.write(path, this.getHTML(), 'w');

	this.echo("ToDoFile saved in " + path);
});

casper.thenEvaluate(function() {
    var elements = __utils__.findAll('table.TableBorder tr');
    __utils__.echo("there are " + elements.length + " fields");

    var fields = [];
    for (var i = 0; i < elements.length; ++i) {
		var keyElements = elements[i].getElementsByClassName("ColName");
		var valueElements = elements[i].getElementsByClassName("ColInput");

    	for (var j = 0; j < keyElements.length; ++j) {
        	var key = keyElements[j];
        	var value = valueElements[j];

            // __utils__.echo("there are " + keyElements.length + " fields");

        	if (key && value) {
        		fields.push({"key" : key.textContent.replace(/\s/g, ""), "value" : value.textContent.replace(/\s/g, "")});
        	}
    	}
    }

    __utils__.echo(JSON.stringify(fields));
});

url = 'http://hrtest00.many-it.com/qhzjj/Web/FormFolder/FW.aspx?GUID=&INFO_ID=14301&VIEW_FLAG=VIEW&VIEWFILE=Y&TIMELIMIT=';
casper.thenOpen(url, function() {
	var path = utils.getTemporaryFile(url);
	fs.write(path, this.getHTML(), 'w');

	this.echo("ToReadFile saved in " + path);
});

casper.thenEvaluate(function() {
    var elements = __utils__.findAll('table.TableBorder tr');
    __utils__.echo("there are " + elements.length + " fields");

    var fields = [];
    for (var i = 0; i < elements.length; ++i) {
		var keyElements = elements[i].getElementsByClassName("ColName");
		var valueElements = elements[i].getElementsByClassName("ColInput");

    	for (var j = 0; j < keyElements.length; ++j) {
        	var key = keyElements[j];
        	var value = valueElements[j];

            // __utils__.echo("there are " + keyElements.length + " fields");

        	if (key && value) {
        		fields.push({"key" : key.textContent.replace(/\s/g, ""), "value" : value.textContent.replace(/\s/g, "")});
        	}
    	}
    }

    __utils__.echo(JSON.stringify(fields));
});

casper.run(function() {
	this.exit();
});
