var fs = require("fs");
var system = require("system");
var utils = require('./utils');
var logger = require('./logger');
var config = require('./config');

var DefaultConfig = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "fetchTimeout" : 30 * 1000,
    "maxAjaxResponses" : 30,
    "consolePrefix": "#",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "logLevel" : 'debug'
};

var CasperEvents = [
  "onAlert",
  "onDie",
  "onError",
  "onLoadError",
  "onPageInitialized",
  "onResourceReceived",
  "onResourceRequested",
  "onStepComplete",
  "onStepTimeout",
  "onTimeout",
  "onWaitTimeout"
];

if (system.args.length < 2) {
	console.log("usage : phantomjs [options] client.js url");
	phantom.exit(0);
}

config = config.mergeConfig(DefaultConfig, config.loadConfig().fetcher);
config.url = system.args[1];

var casper = require("casper").create({
   clientScripts : ["humanize.js", "visualize.js"],
   pageSettings : {
	   loadPlugins : false,
	   loadImages : false
   },
   viewportSize : {
	   width: config.viewportWidth,
	   height: config.viewportHeight
   },
   userAgent : config.userAgent,
   logLevel : config.logLevel,
   verbose : true
});

var pageInfo = {
	ajaxRequests : 0,
	ajaxResponses : 0
};

casper.on('resource.requested', function(requestData, request) {
	// this.echo(requestData.url);
	++pageInfo.ajaxRequests;
});

casper.on('resource.received', function(requestData, request) {
	// this.echo(requestData.url);
	++pageInfo.ajaxResponses;
});

casper.start(config.url, function() {
	this.scrollToBottom();
});

// wait for a second
casper.wait(5000, function() {
	this.evaluate(function() {
    	document.body.setAttribute("data-url", document.URL);

    	var debug = false;
    	var ele = debug ? document.body : document.body.getElementsByTagName('div')[0];
    	ele.setAttribute("id", "QiwurScrapingMetaInformation");
    	ele.setAttribute("data-domain", document.domain);
    	ele.setAttribute("data-url", document.URL);
    	ele.setAttribute("data-base-uri", document.baseURI);

    	__qiwur__visualize(document);
    	__qiwur__humanize(document);

    	// if any script error occurs, the flag can NOT be seen
    	document.body.setAttribute("data-evaluate-error", 0);
	});
});

casper.then(function () {
	var file = utils.getTemporaryFile(config.url);
	var content = casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	fs.write(file, content, 'w');

	this.echo("full page content has been saved in file : " + file);
});

casper.run(function() {
	this.exit();
});
