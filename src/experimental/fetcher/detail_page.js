var fs = require("fs");
var system = require("system");
var utils = require('utils');

var md5 = vendor('md5');
var logger = vendor('logger');
var config = vendor('config');

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
    "logLevel" : 'debug',

    "scentServer" : "http://localhost:8181",
    "extractSerivce" : "http://localhost:8181/scent/extract",
    "extractJustInTime" : false
};

conf = config.mergeConfig(Defaultconf, config.loadConfig().fetcher);

var casper = require('casper').create(
	{
		clientScripts : ['lib.old/humanize.js', 'lib.old/visualize.js', 'lib.old/clientutils.js', 'lib.old/jquery-1.11.2.js'],
		pageSettings : {
			loadImages : true,
			loadPlugins : false,
			userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
		},
		viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
		logLevel : "debug",
		verbose : true
	});

var sites = config.loadConfig("config/sites.json");

if (system.args.length < 2) {
	console.log("usage : phantomjs [options] cclient.js <site-name>");

	console.log("site name is one of the following : " + JSON.stringify(listSites(sites)));

	phantom.exit(0);
}

var siteName = system.args[1];
var site = findSiteConfig(sites, siteName);
if (!site) {
	console.log("No site available");
	phantom.exit(0);
}

logger.info("=============================");
logger.info(conf);
logger.info(site);

var indexPageCounter = 1;
var detailPageCounter = 1;
var detailPageLinks = [];

/*******************************************************************************
 * network events
 ******************************************************************************/
casper.on('resource.requested', function(requestData, networkRequest) {
	for (var i = 0; i < conf.forbiddenLinkPatterns.length; ++i) {
		if (conf.forbiddenLinkPatterns[i].test(requestData.url)) {
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
casper.start(site.seed).then(function() {
	this.scrollToBottom();
}).then(function() {
	this.waitForSelector(site.paginatorSelector, processIndexPages, terminate);
});

casper.run(function() {
	this.exit();
});

function getDetailPageLocalFileName(siteName, url) {
	var fileNumber = md5.hex_md5(url);

	var fileName = "web/detail/" + siteName + "/" + "detail-" + fileNumber + ".html";

	return fileName;
}

/*******************************************************************************
 * casper functions, casper object must be passed in
 ******************************************************************************/
var terminate = function() {
	this.echo("That's all, folks.").exit();
};

var ignore = function() {
	this.echo("Ignore url " + this.getCurrentUrl());
};

var processDetailPage = function(url) {
	// open detail page
	this.thenOpen(url, function() {
//		this.echo('Detail page title: ' + this.getTitle());
//		var file = "/tmp/monitor/detail-" + detailPageCounter + ".png";
//		this.capture(file);
	});

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

	this.then(function() {
		captureAreas.call(this);
	});

	// cache page content
	this.then(function () {
		saveDetailPage.call(this);
	});

	this.thenBypassUnless(function() {
		return conf.extractJustInTime;
	}, 1);

	// post to extract server
	this.thenOpen(conf.extractSerivce, {
		method : 'post',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : {
			html : this.getHTML(),
			format : 'Wiki'
		}
	});

	this.waitFor(function() {
	  return url !== this.getCurrentUrl();
	});

	this.then(function(response) {
		this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		this.debugPage();
		utils.dump(response);
		// autoExtractDetailPage.call(this);
	});
};

var saveDetailPage = function() {
	var fileName = getDetailPageLocalFileName(siteName, this.getCurrentUrl());
	var file = conf.cacheDirectory + "/" + fileName;

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

var captureAreas = function() {
	for (var i = 0; i < site.detailPageCaptureAreas.length; ++i) {
		var captureArea = site.detailPageCaptureAreas[i];
		if (this.exists(captureArea.selector)) {
			// TODO : OR we need select the first element via the selector

			// create a new element to hold the target capture area to avoid noise
			this.evaluate(function(captureAreaSelector) {
				__qiwur_createCaptureArea(captureAreaSelector);
			}, captureArea.selector);

			var fileName = getDetailPageLocalFileName(siteName, this.getCurrentUrl());
			var relativeImagePath = fileName + "." + captureArea.name + ".png";
			var imagePath = conf.cacheDirectory + "/" + relativeImagePath;
			var selectorParts = captureArea.selector.split(/\s+/);
			var captureTargetSelector = '.QiwurCaptureArea > div.holder ' + selectorParts[selectorParts.length - 1];
			this.captureSelector(imagePath, captureTargetSelector);

			// clean capture area
			this.evaluate(function(nearBy, name, imagePath) {
				__qiwur_cleanCaptureArea();
				__qiwur_insertImage(nearBy, name, imagePath);
			}, captureArea.selector, captureArea.name, relativeImagePath);
		} // if
	} // for
}

var autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.debugPage();

	// var file = "/tmp/monitor/extract-" + detailPageCounter + ".png";
	// this.capture(file);
}
