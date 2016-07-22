var fs = require("fs");
var utils = require('utils');
var system = require('system');

var logger = vendor('logger');
var sutils = vendor('sutils');
var configure = vendor('configure').create();

var DefaultConfig = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "fetchTimeout": 30 * 1000,
    "maxAjaxResponses": 30,
    "consolePrefix": "#",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "logLevel": 'debug'
};

var args = phantom.satelliteArgs;
if (args.length < 1) {
    console.log("usage : satellite [options] simple_browser.js url");
    phantom.exit(0);
}

config = configure.mergeConfig(DefaultConfig, configure.loadConfig().fetcher);
var url = config.url = args[0];

var casper = require("casper").create({
    clientScripts: ['src/lib/client/dist/satellite.min.js'],
    pageSettings: {
        loadPlugins: false,
        loadImages: false
    },
    viewportSize: {
        width: config.viewportWidth,
        height: config.viewportHeight
    },
    userAgent: config.userAgent,
    logLevel: config.logLevel,
    verbose: true
});

var pageInfo = {
    ajaxRequests: 0,
    ajaxResponses: 0
};

casper.on('resource.requested', function (requestData, request) {
    // this.echo(requestData.url);
    ++pageInfo.ajaxRequests;
});

casper.on('resource.received', function (response) {
    // this.echo(response.url);
    ++pageInfo.ajaxResponses;
});

// TODO : lock the navigation
casper.start(config.url, function () {
    this.scrollToBottom();
});

// wait for a second
// casper.wait(5000, function() {
//     __utils__.echo("start evaluate");
//
// 	this.evaluate(function() {
//     	document.body.setAttribute("data-url", document.URL);
//
//     	var ele = document.createElement("input");
//     	ele.setAttribute("type", "hidden");
//     	ele.setAttribute("id", "QiwurScrapingMetaInformation");
//     	ele.setAttribute("data-domain", document.domain);
//     	ele.setAttribute("data-url", document.URL);
//     	ele.setAttribute("data-base-uri", document.baseURI);
//     	document.body.appendChild(ele);
//
//     	__qiwur__visualize(document);
//     	__qiwur__humanize(document);
//
//     	// if any script error occurs, the flag can NOT be seen
//     	document.body.setAttribute("data-evaluate-error", 0);
// 	});
// });

casper.then(function () {
    var file = sutils.getTemporaryFile(config.url);
    var content = casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
    fs.write(file, content, 'w');

    this.echo("full page content has been saved in file : " + file);
});

casper.run(function () {
    this.exit();
});
