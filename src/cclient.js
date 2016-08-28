/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/

var system = require("system");
var fs = require("fs");
var utils = require('utils');
var sutils = vendor('sutils');
var md5 = vendor("md5");
var logger = vendor('logger');
var configure = vendor('configure').create();

var DefaultConf = {
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

conf = configure.mergeConfig(DefaultConf, configure.loadConfig().fetcher);

var status = 'OK';

var casper = require('casper').create(
	{
		clientScripts : ['src/lib/client/dist/satellite.min.js'],
		pageSettings : {
			loadImages : true,
			loadPlugins : false,
			userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
		},
		viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
		logLevel : "debug",
		verbose : true,
		stepTimeout : 5000,
		timeout : 5000,
		onTimeout : function(timeout) {
			status = 'timeout';
			this.echo("timeout " + timeout);
		},
		onStepTimeout : function(timeout, stepNum) {
			this.echo("timeout " + timeout + ", stepNum " + stepNum);
		},
		onWaitTimeout : function(timeout) {
			this.echo("wait timeout " + timeout);
		}
	});

var sites = configure.loadConfig("config/sites.json");

if (system.args.length < 2) {
	console.log("usage : monitor [options] cclient.js <site-name>");

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
	this.echo("received : " + response.url);

	// check response status
	
	if (response.url.indexOf("extract") !== -1) {
		// utils.dump(response);
	}
});

casper.on('resource.error', function(resourceError) {
	this.echo("resource.error : " + resourceError.errorString);
});

casper.on("http.status.404", function(resource) {
	this.echo(resource.url + " is not found", "COMMENT");
});

casper.on('url.changed', function(targetUrl) {
	this.echo('New URL: ' + targetUrl);
});

casper.on('complete.error', function(err) {
	this.echo("Complete callback has failed: " + err);
});

casper.on('capture.saved', function(targetFile) {
    this.echo("Capture saved : " + targetFile);
});

casper.on('click', function(selector) {
    this.echo("Element clicked, selector : " + selector);
});

casper.on('die', function(message, status) {
    this.die("Die : " + message + ", status : " + status);
});

casper.on('error', function(message, backtrace) {
    this.echo("Error : " + message + ", backtrace : " + backtrace);
});

casper.on('exit', function(status) {
    this.echo("Exit : " + status);
});

casper.on('fill', function(selector, vals, submit) {
    this.echo("Form is filled : " + selector + ", " + vals + ", " + submit);
});

casper.on('load.started', function() {
    this.echo("Load started");
});

casper.on('load.failed', function() {
    this.echo("load.failed");
});

casper.on('load.finished', function() {
    this.echo("load.finished");
});

casper.on('step.timeout', function() {
    this.echo("step.timeout");
});

casper.on('timeout', function() {
    this.echo("timeout");
});

/*******************************************************************************
 * start main logic
 ******************************************************************************/
casper.start(site.seed).then(function() {
	if (status == 'timeout') {
		terminate.call(this);
	}

	this.scrollToBottom();
}).then(function() {
	processSeedPage.call(this);
}).then(function() {
	this.waitForSelector(site.paginatorSelector, processIndexPages, noSuchSelectorHandler);
});

casper.run(function() {
	this.exit(0);
});

/*******************************************************************************
 * free functions
 ******************************************************************************/
function listSites(sites) {
	return Array.prototype.map.call(sites, function(site) {
		return site.name;
	});
}

function findSiteConfig(sites, name) {
	for (var i = 0; i < sites.length; ++i) {
		if (sites[i].name == name) {
			return sites[i];
		}
	}
}

function getDetailPageLocalFileName(siteName, url) {
	var fileNumber = md5.hex_md5(url);

	var fileName = "web/detail/" + siteName + "/" + "detail-" + fileNumber + ".html";

	return fileName;
}

/*******************************************************************************
 * casper functions, casper object must be passed in
 ******************************************************************************/
var noSuchSelectorHandler = function() {
	this.echo("No such selector available in this page.").exit();
};

var terminate = function() {
	this.echo("That's all, folks.").exit();
};

var ignore = function() {
	this.echo("Ignore url " + this.getCurrentUrl());
};

var processSeedPage = function() {
	processIndexPages.call(this);
};

var processIndexPages = function() {
//	var file = "/tmp/monitor/index-" + indexPageCounter + ".png";
//
//	this.captureSelector(file, site.indexPageMainAreaSelector);

	if (indexPageCounter >= site.startPage) {
		collectDetailPageLinks.call(casper);
	}

	// don't go too far down the rabbit hole
	if (indexPageCounter >= site.maxIndexPageCount || !this.exists(site.nextPageSelector)) {
		this.then(function() {
			processDetailPages.call(this);
		});

		return;
	}

	indexPageCounter++;
	this.echo("requesting next page: " + indexPageCounter);
	var url = this.getCurrentUrl();
	this.thenClick(site.nextPageSelector).then(function() {
		this.waitFor(function() {
			return url !== this.getCurrentUrl();
		}, // testFn
		processIndexPages, // then
		processDetailPages, // onTimeout
		10 * 1000); // timeout
	});
};

var collectDetailPageLinks = function() {
	if (indexPageCounter < site.startPage) {
		return;
	}

	var links = this.evaluate(function(selector, regex) {
		return __warps__searchLinks(selector, regex);
	}, site.indexPageMainAreaSelector, site.detailPageUrlRegex);

	if (!links || links.length == 0) {
		logger.warn("No any detail links");
	}

	if (links) {
		detailPageLinks = detailPageLinks.concat(links);
		this.echo(links.length + ' detail page links');

//		for (var i = 0; i < links.length; ++i) {
//			this.echo('Found detail page links : ' + links[i]);
//		}
	}
};

var processDetailPages = function() {
	 this.echo(detailPageCounter + ", " + detailPageLinks.length);
	 for (var i = 0; i < detailPageLinks.length; ++i) {
		 this.echo('Detail page : ' + detailPageLinks[i]);
	 }

	// don't go too far down the rabbit hole
	if (detailPageCounter > site.maxDetailPageCount
			|| detailPageCounter > detailPageLinks.length) {
		this.then(function() {
			terminate.call(this);
		});

		return;
	}

	var url = detailPageLinks[detailPageCounter - 1];
	this.echo(detailPageCounter + 'th detail page : ' + url);

	detailPageCounter++;

	processDetailPage.call(casper, url);
};

var processDetailPage = function(url) {
	// open detail page
	this.thenOpen(url, function() {
		this.echo('Detail page title: ' + this.getTitle());
		var file = "/tmp/monitor/detail-" + detailPageCounter + ".png";
		this.capture(file);
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
		__warps__visualizeHumanize();
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
			format : 'All'
		}
	});

	// .waitFor(function() {
	// return url !== this.getCurrentUrl();
	// })

	this.then(function(response) {
		this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		// this.debugPage();
		// utils.dump(response);
		// autoExtractDetailPage.call(this);
	});

	this.then(function() {
		processDetailPages.call(this);
	});
};

var saveIndexPage = function() {
	var file = conf.cacheDirectory + "/web/detail/" + site.name + "/"
		+ "index-" + indexPageCounter + ".html";

	var content = this.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
}

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
};

var captureAreas = function() {
	if (!site.detailPageCaptureAreas) {
		return;
	}

	for (var i = 0; i < site.detailPageCaptureAreas.length; ++i) {
		var captureArea = site.detailPageCaptureAreas[i];
		if (this.exists(captureArea.selector)) {
			// TODO : OR we need select the first element via the selector

			// create a new element to hold the target capture area to avoid noise
			this.evaluate(function(captureAreaSelector) {
				__warps_createCaptureArea(captureAreaSelector);
			}, captureArea.selector);

			var fileName = getDetailPageLocalFileName(siteName, this.getCurrentUrl());
			var relativeImagePath = fileName + "." + captureArea.name + ".png";
			var imagePath = conf.cacheDirectory + "/" + relativeImagePath;
			var selectorParts = captureArea.selector.split(/\s+/);
			var captureTargetSelector = '.WarpsCaptureArea > div.holder ' + selectorParts[selectorParts.length - 1];
			this.captureSelector(imagePath, captureTargetSelector);

			// clean capture area
			this.evaluate(function(nearBy, name, imagePath) {
				__warps_cleanCaptureArea();
				__warps_insertImage(nearBy, name, imagePath);
			}, captureArea.selector, captureArea.name, relativeImagePath);
		} // if
	} // for
};

var autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.debugPage();

	// var file = "/tmp/monitor/extract-" + detailPageCounter + ".png";
	// this.capture(file);
};
