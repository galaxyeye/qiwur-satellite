var fs = require("fs");
var system = require("system");
var utils = require('utils');

require(fs.absolute("bootstrap"));

var sateutils = vendor('utils');
var md5 = vendor('md5');
var base64 = vendor('base64');
var logger = vendor('logger');

var Defaultconf = {
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

//    "scentServer" : "http://localhost:8181",
//    "extractSerivce" : "http://localhost:8181/scent/extract",
//    "extractJustInTime" : false
};

conf = config.loadConfig();
conf.fetcher = config.mergeConfig(Defaultconf, conf.fetcher);

var casper = require('casper').create(
	{
		clientScripts : ['lib.old/humanize.js', 'lib.old/visualize.js', 'lib.old/clientutils.js', 'lib.old/jquery-1.11.2.js'],
		pageSettings : {
			loadImages : true,
			loadPlugins : false,
			userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
		},
		viewportSize : { width: conf.fetcher.viewportWidth, height: conf.fetcher.viewportHeight },
		logLevel : "debug",
		verbose : true
	});

if (system.args.length < 2) {
	console.log("usage : phantomjs [options] cclient.js <url>");

	phantom.exit(0);
}

var url = system.args[1];
var siteName = "www";

logger.info("load url " + url);
logger.info(conf);

/*******************************************************************************
 * network events
 ******************************************************************************/
casper.on('resource.requested', function(requestData, networkRequest) {
	if (requestData.url.indexOf("echo") !== -1) {
		// utils.dump(requestData.postData);
		fs.write("/tmp/1", requestData.postData, 'w');
	}

	for (var i = 0; i < conf.fetcher.forbiddenLinkPatterns.length; ++i) {
		if (conf.fetcher.forbiddenLinkPatterns[i].test(requestData.url)) {
			this.echo("Aborting " + requestData.url);
			networkRequest.abort();
			return;
		}
	}
});

casper.on('resource.received', function(response) {
	// this.echo("received : " + response.url);

	if (response.url.indexOf("extract") !== -1) {
		// utils.dump(response);
	}
});

casper.on("http.status.404", function(resource) {
	this.echo(resource.url + " is not found", "COMMENT");
});

casper.on('url.changed', function(targetUrl) {
	// console.log('New URL: ' + targetUrl);
});

/*******************************************************************************
 * start main logic
 ******************************************************************************/
casper.start(url).then(function() {
	processDetailPage.call(this);
});

casper.thenBypassUnless(function() {
	// return config.extractJustInTime;
	return true;
}, 1);

// config.extractService.url = "http://localhost:8181/scent/echo";

casper.then(function() {
	extractDetailPage.call(this, conf.extractService.url);
});

casper.run(function() {
	this.exit();
});

/*******************************************************************************
 * free functions
 ******************************************************************************/
function getDetailPageLocalFileName(siteName, url) {
	var fileNumber = md5.hex_md5(url);

	var fileName = "web/detail/" + siteName + "/" + "detail-" + fileNumber + ".html";

	return fileName;
}

/*******************************************************************************
 * casper functions, casper object must be passed in
 ******************************************************************************/
var processDetailPage = function() {
	this.then(function() {
		this.scrollToBottom();
	});

//	this.wait(5000);

	// Scroll to top again to calculate original element positions
	this.then(function() {
		this.scrollTo(0, 0);
	});

	// humanize and visualize
	this.thenEvaluate(function() {
		__qiwur__visualizeHumanize();
	});

	// cache page content
	this.then(function () {
		saveDetailPage.call(this);
	});
};

var extractDetailPage = function(extractServiceUrl) {
	// post to extract server
	this.thenOpen(extractServiceUrl, {
		method : 'post',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : {
			html : base64.encode(this.getHTML()),
			format : 'Wiki'
		}
	});

	this.waitFor(function() {
	  return url !== this.getCurrentUrl();
	});

	this.then(function(response) {
		this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		this.debugPage();
		// utils.dump(response);
		// autoExtractDetailPage.call(this);
	});	
};

var saveDetailPage = function() {
	var fileName = getDetailPageLocalFileName(siteName, this.getCurrentUrl());
	var file = conf.fetcher.cacheDirectory + "/" + fileName;

	// Note : can we do this in DOM?
	// Answer : probably NOT.
	// 1. change DOM in casper.evaluate does no work, every change on the DOM leads actual network actions
	// 2. using other static DOM tools leads to lower performance
	var content = this.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	// replace all relative links to absolute links
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
}

var autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.debugPage();

	// var file = "/tmp/monitor/extract-" + detailPageCounter + ".png";
	// this.capture(file);
}
