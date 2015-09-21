var config = require('./../config');
var logger = require('./../logger');
var sateutils = require('./../utils');
var utils = require('utils');
var fs = require("fs");

var seedUrl = "http://vacations.ctrip.com/whole-1B126-U-Beijing/?searchValue=%d6%dc%b1%df&searchText=%d6%dc%b1%df";
var indexPageMainAreaSelector = "#searchResultContainer";
var paginatorSelector = ".pkg_page";
var nextPageSelector = ".pkg_page .down";
var maxIndexPageCount = 1;
var maxDetailPageCount = 5;

var scentServer = "http://localhost:8181";
var extractSerivce = scentServer + "/scent/extract";

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

config = config.mergeConfig(DefaultConfig, config.loadConfig().fetcher);
config.url = system.args[1];

var casper = require('casper').create(
	{
		clientScripts : ['./../humanize.js', './../visualize.js'],
		pageSettings : {
			loadImages : false,
			loadPlugins : false,
			userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
		},
		logLevel : "debug",
		verbose : true
	});

var indexPageCounter = 1;
var detailPageCounter = 1;
var detailPageLinks = [];

/*******************************************************************************
 * network events
 ******************************************************************************/
casper.on('resource.requested', function(requestData, networkRequest) {
	// networkRequest.setHeader("Accept-Charset", "gb2312");
	// networkRequest.setHeader("Accept-Language", "zh-CN");

	if (requestData.url.indexOf("extract") !== -1) {
		// this.log("requested : " + requestData.url, "debug");
		// utils.dump(requestData);
		// logger.debug(utils.serialize(requestData));
		logger.debug(requestData);
	}
});

casper.on('resource.received', function(response) {
	// this.echo("received : " + response.url);

	if (response.url.indexOf("extract") !== -1) {
		utils.dump(response);
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
casper.start(seedUrl).then(function() {
	logger.debug("----------------------");
	this.scrollToBottom();
}).then(function() {
	this.waitForSelector(paginatorSelector, processIndexPages, terminate);
});

casper.run(function() {
	this.exit();
});

/*******************************************************************************
 * casper functions, casper object must be passed in
 ******************************************************************************/
var terminate = function() {
	this.echo("That's all, folks.").exit();
};

var processIndexPages = function() {
	var file = "/tmp/satellite/vacations.ctrip.com.whole-1B126-U-Beijing-"
			+ indexPageCounter + ".png";

	this.captureSelector(file, indexPageMainAreaSelector);

	collectDetailPageLinks.call(casper);

	// don't go too far down the rabbit hole
	if (indexPageCounter >= maxIndexPageCount || !this.exists(nextPageSelector)) {
		this.then(function() {
			processDetailPages.call(this);
		});

		return;
	}

	indexPageCounter++;
	this.echo("requesting next page: " + indexPageCounter);
	var url = this.getCurrentUrl();
	this.thenClick(nextPageSelector).then(function() {
		this.waitFor(function() {
			return url !== this.getCurrentUrl();
		}, processIndexPages);
	});
};

var collectDetailPageLinks = function() {
	var links = this.evaluate(browser_searchDetailPageLinks,
			indexPageMainAreaSelector);
	if (links) {
		detailPageLinks = detailPageLinks.concat(links);

		// for (var i = 0; i < links.length; ++i) {
		// this.echo('Found detail page links : ' + links[i]);
		// }
	}
};

var processDetailPages = function() {
	// this.echo(detailPageCounter + ", " + detailPageLinks.length);
	// for (var i = 0; i < detailPageLinks.length; ++i) {
	// this.echo('Detail page : ' + detailPageLinks[i]);
	// }

	// don't go too far down the rabbit hole
	if ((detailPageCounter >= maxDetailPageCount)
			|| (detailPageCounter > detailPageLinks.length)) {
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
	this.thenOpen(url, function() {
		this.echo('Detail page title: ' + this.getTitle());
		var file = "/tmp/satellite/detail.ctrip.com-" + detailPageCounter + ".png";
		this.capture(file);
	}).thenEvaluate(function() {
    	document.body.setAttribute("data-url", document.URL);

    	var ele = document.createElement("input");
    	ele.setAttribute("type", "hidden");
    	ele.setAttribute("id", "QiwurScrapingMetaInformation");
    	ele.setAttribute("data-domain", document.domain);
    	/**
    	 * QiwurScrapingMetaInformation versoin : 
    	 * No version : as the same as 0.1.0, the first div was selected as the holder
    	 * 0.2.0 : add a input element at the end of body element
    	 * */
    	ele.setAttribute("data-version", "0.2.0");
    	ele.setAttribute("data-url", document.URL);
    	ele.setAttribute("data-base-uri", document.baseURI);
    	document.body.appendChild(ele);

    	__qiwur__visualize(document);
    	__qiwur__humanize(document);

    	// if any script error occurs, the flag can NOT be seen
    	document.body.setAttribute("data-evaluate-error", 0);

	}).thenOpen(extractSerivce, {
		method : 'post',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : {
			html : this.getHTML(),
			format : 'All'
		}
	})
	// .waitFor(function() {
	// return url !== this.getCurrentUrl();
	// })
	.then(function(response) {
		this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		// this.debugPage();
		// utils.dump(response);
		// autoExtractDetailPage.call(this);
	}).then(function() {
		processDetailPages.call(this);
	});
};

var autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.debugPage();

	// var file = "/tmp/satellite/extract-" + detailPageCounter + ".png";
	// this.capture(file);
}

/*******************************************************************************
 * browser side functions
 ******************************************************************************/
// Fetch all <a> elements from the page and return
// the ones which contains a href starting with 'http://'
function browser_searchDetailPageLinks(indexPageMainAreaSelector) {
	var filter = Array.prototype.filter;
	var map = Array.prototype.map;

	// indexPageMainAreaSelector is a global variable, TODO : move it to be a
	// function parameter
	return map.call(filter.call(document
			.querySelectorAll(indexPageMainAreaSelector + " a"), function(a) {
		return (/^http:\/\/.*/i).test(a.getAttribute("href"));
	}), function(a) {
		return a.getAttribute("href");
	});
}
