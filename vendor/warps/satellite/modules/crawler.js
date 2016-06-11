/**
 * Entity crawler module
 * */
var require = patchRequire(require);
var utils = require('utils');
var fs = require('fs');
var system = require("system");

var logger = vendor("logger");
var md5 = vendor("md5");

exports.create = function create(options) {
	"use strict";
	return new Crawler(options);
};

var DefaultSiteOptions = {
	extract : {
		justInTime : false,
		serivce : 'http://localhost:8082'
	}
};

/**
 * TODO : move casper outside the file
 * */
var Crawler = function Crawler(options) {
	"use strict";

	/*jshint maxstatements:40*/
	// init & checks
	if (!(this instanceof Crawler)) {
		return new Crawler(options);
	}

	this.startTime = new Date();

    this.options = utils.mergeObjects(DefaultSiteOptions, options);

	this.config = options.config;

    this.casper = options.casper;

    // for exclusive functions
	this.casper.crawler = this;

	this.counter = {
		indexPages : 0,
		detailPages : 0
	};

    this.data = {
		detailPageLinks : []
	};
};

Crawler.prototype.start = function() {
	"use strict";

	if (!this.options.entity.name) {
		logger.error('no entity specified, exit...');
		this.die('no entity specified, exit...');
	}

	var seed = this.options.entity.seed;
	this.casper.start(seed).then(function() {
//		this.echo("＝＝＝" + this.status(true));

		this.scrollToBottom();
	});

	this.casper.then(function() {
		this.crawler.processSeedPage(seed);
	});

	this.casper.run(function() {
		this.exit(0);
	});

	return this;
};

Crawler.prototype.onSelectorNotExists = function() {
	this.echo("No such selector available in this page.").exit();
};

Crawler.prototype.echo = function(text, style, pad) {
	if (!style) {
		style = 'TRACE';
	}
	this.casper.echo(text, style, pad);
	return this;
};

Crawler.prototype.exit = function(status) {
	this.casper.exit(status);
};

Crawler.prototype.terminate = function(message) {
	message = message || "That's all";
	this.casper.then(function() {
		this.echo(message).exit();
	});
};

Crawler.prototype.ignore = function() {
	this.echo("Ignore url " + this.casper.getCurrentUrl());
};

/**
 * TODO : not implemented yet
 * */
Crawler.prototype.optionChecker = function() {
	var checker = vendor('./object_checker');
	checker.require(this.options.entity.page.index.limit);
	checker.require(this.options.entity.page.index.next);
};

/**
 * Process seed page
 * */
Crawler.prototype.processSeedPage = function() {
//	this.echo("processSeedPage");

	this.processIndexPage();
};

/**
 * Process index page
 * */
Crawler.prototype.processIndexPage = function() {
//	var file = "/tmp/monitor/index-" + indexPageCounter + ".png";

//	this.captureSelector(file, entityOptions.indexPageMainAreaSelector);

	// if this object has a crawler member, it's the casper object
	// if not, it's the crawler object
	// TODO : how to avoid this intrusion?
	var $ = this.crawler || this;

    this.echo("Processing index page " + $.casper.getCurrentUrl());
	$.saveIndexPage();
	$.counter.indexPages++;

    $.collectDetailPageLinks();

    var limit = $.options.entity.page.index.limit;
    var next = $.options.entity.page.index.paginator.next;
	// don't go too far down the rabbit hole
	if ($.counter.indexPages >= limit || !next || !$.casper.exists(next)) {
		this.echo("All done. Crawled : " + $.counter.indexPages + " index pages. Limit : " + limit);
		$.casper.then(function() {
			$.processDetailPages();
		});

		return;
	}

	$.echo("Requesting next page: " + $.counter.indexPages);

	// go to the next index page
	var url = $.casper.getCurrentUrl();
	$.casper.thenClick(next).then(function() {
		this.waitFor(function() {
				this.echo("click, " + this.status(true));

				return url !== this.getCurrentUrl();
			}, // testFn
			$.processIndexPage, // then
			$.processDetailPages, // onTimeout
			10 * 1000); // timeout
	});
};

/**
 * Collect detail page links
 * */
Crawler.prototype.collectDetailPageLinks = function() {
	var mainArea = this.options.entity.page.index.main;
	var pageRegex = this.options.entity.page.detail.regex;

	if (!mainArea || !this.casper.exists(mainArea)) {
		this.echo('No main area with selector ' + mainArea, 'WARN');
		return;
	}

	if (!pageRegex) {
		this.echo('Invalid detail page regex', 'WARN');
		return;
	}

    this.echo('Try to extract links with regex ' + pageRegex + ' in area ' + mainArea);
	var links = this.casper.evaluate(function(selector, pageRegex) {
		return __qiwur__searchLinks(selector, pageRegex);
	}, mainArea, pageRegex);

	if (!links || links.length == 0) {
        this.echo('No any detail links', 'WARN');
		return;
	}

	this.data.detailPageLinks = this.data.detailPageLinks.concat(links);

	// make the array unique
	this.data.detailPageLinks = this.data.detailPageLinks.sort().filter(function(el, i, arr) {
		return (i == arr.indexOf(el));
	});

	this.echo('Extracted ' + links.length + ' detail page links');
};

/**
 * Report current status
 * */
Crawler.prototype.report = function() {
	this.echo("detail pages : " + this.counter.detailPages
		+ ", detail page links : " + this.data.detailPageLinks.length);
	utils.dump(this.data.detailPageLinks);
};

/**
 * Process all collected detail page links.
 *
 * Browse every page and then
 * 1) save them in local disk
 * 2) upload them onto a server
 * 3) insert into a database
 *
 * */
Crawler.prototype.processDetailPages = function() {
	// this can be crawler or casper
	// TODO : avoid the confusion
	var $ = this.crawler || this;

	this.report();

	// don't go too far down the rabbit hole
	var limit = $.options.entity.page.detail.limit;
	if ($.counter.detailPages > limit) {
		return this.terminate("All done. " + $.counter.detailPages + " detail pages are fetched.");
	}

	// all detail pages are OK
	if ($.counter.detailPages > $.data.detailPageLinks.length) {
		return this.terminate("All done. " + $.data.detailPageLinks.length + " detail pages in fetch list are fetched.");
	}

	var links = $.data.detailPageLinks;
	for (var i = 0; i < links.length; ++i) {
		$.echo($.counter.detailPages + 'th detail page : ' + links[i]);
		$.processDetailPage(links[i]);
	}
};

/**
 * Process detail page
 * */
Crawler.prototype.processDetailPage = function(url) {
	var $ = this.crawler || this;
	var casper = $.casper;

	$.counter.detailPages++;

	// open detail page
	casper.thenOpen(url, function() {
		this.echo('Detail page title: ' + this.getTitle());
		var file = "/tmp/satellite/detail-" + $.counter.detailPages + ".png";
		this.capture(file);
	});

    var wait = $.options.entity.detailPageWaitTime = 5000;
    casper.then(function() {
        this.wait(wait);
    });

	casper.then(function() {
		this.scrollToBottom();
	});
    
	// Scroll to top again to calculate original element positions
	casper.then(function() {
		this.scrollTo(0, 0);
	});

	// humanize and visualize
	casper.thenEvaluate(function() {
		__qiwur__visualizeHumanize();
	});

	casper.then(function() {
		this.crawler.captureAreas();
	});

	// cache page content
	casper.then(function () {
		this.crawler.saveDetailPage();
	});

	casper.thenBypassUnless(function() {
		// this.echo(extractJustInTime);
		return this.crawler.options.extract.justInTime;
	}, 1);

	// post to extract server
	casper.thenOpen($.options.extract.serivce, {
		method : 'post',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : {
			html : casper.getHTML(),
			format : 'All'
		}
	});

	// .waitFor(function() {
	// return url !== this.getCurrentUrl();
	// })

	casper.then(function(response) {
		this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		// this.debugPage();
		// utils.dump(response);
		// autoExtractDetailPage.call(this);
	});

//	casper.then(function() {
//		this.crawler.processDetailPages();
//	});
};

/**
 * Save index page
 * */
Crawler.prototype.saveIndexPage = function() {
	var dir = this.config.cacheDirectory;
	var domain = this.options.entity.name;
	var date = (1 + this.startTime.getMonth()) + "_" + this.startTime.getDate();
	var url = this.casper.getCurrentUrl();

	var file = getIndexPageLocalPath(dir, domain, date, url);

	var content = this.casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
};

/**
 * Save detail page
 * */
Crawler.prototype.saveDetailPage = function() {
	var dir = this.config.cacheDirectory;
	var domain = this.options.entity.name;
	var date = (1 + this.startTime.getMonth()) + "_" + this.startTime.getDate();
	var url = this.casper.getCurrentUrl();

	var file = getDetailPageLocalPath(dir, domain, date, url);

	// Note : can we do this in DOM?
	// Answer : probably NOT.
	// 1. change DOM in casper.evaluate does no work, every change on the DOM leads actual network actions
	// 2. using other static DOM tools leads to lower performance
	var content = this.casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	// replace all relative links to absolute links
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
};

/**
 * Capture page area, save the picture into local disk
 * */
Crawler.prototype.captureAreas = function() {
	var captureOptions = this.options.entity.page.detail.capture;

	if (!captureOptions) {
		return;
	}

	for (var i = 0; i < captureOptions.length; ++i) {
		var captureArea = captureOptions[i];
		if (this.casper.exists(captureArea.selector)) {
			// TODO : OR we need select the first element via the selector

			// create a new element to hold the target capture area to avoid noise
			this.casper.evaluate(function(captureAreaSelector) {
				__qiwur_createCaptureArea(captureAreaSelector);
			}, captureArea.selector);

			var dir = this.config.cacheDirectory;
			var domain = this.options.entity.name;
			var date = (1 + this.startTime.getMonth()) + "_" + this.startTime.getDate();
			var url = this.casper.getCurrentUrl();
			var fileName = getDetailPageLocalPath(dir, domain, date, url);

			// var fileName = getDetailPageLocalPath(options.name, this.casper.getCurrentUrl());
			var imagePath = fileName + "." + captureArea.name + ".png";
			var selectorParts = captureArea.selector.split(/\s+/);
			var captureTargetSelector = '.QiwurCaptureArea > div.holder ' + selectorParts[selectorParts.length - 1];
			this.casper.captureSelector(imagePath, captureTargetSelector);

			// clean capture area
			this.casper.evaluate(function(nearBy, name, imagePath) {
				__qiwur_cleanCaptureArea();
				__qiwur_insertImage(nearBy, name, imagePath);
			}, captureArea.selector, captureArea.name, relativeImagePath);
		} // if
	} // for
};

/**
 * Extract detail page using auto extraction API
 * */
Crawler.prototype.autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.casper.debugPage();

	// var file = "/tmp/satellite/extract-" + detailPageCounter + ".png";
	// this.capture(file);
};

/*******************************************************************************
 * free functions, TODO : move to utils
 ******************************************************************************/
function listEntities(entities) {
	return Array.prototype.map.call(entities, function(entity) {
		return entity.name;
	});
}

function findSiteConfig(entities, name) {
	for (var i = 0; i < entities.length; ++i) {
		if (entities[i].name == name) {
			return entities[i];
		}
	}
}

function getIndexPageLocalPath(dir, domain, date, url) {
	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date +  "/index/" + fileName + ".html";

	return dir + path;
}

function getDetailPageLocalPath(dir, domain, date, url) {
	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date + "/detail/" + fileName + ".html";

	return dir + path;
}
