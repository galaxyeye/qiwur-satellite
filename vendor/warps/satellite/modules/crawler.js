"use strict";

/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/

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
//		this.log("＝＝＝" + this.status(true));

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
	this.log("No such selector available in this page.").exit();
};

/**
 * Prints something to stdout.
 *
 * @param  text   String  A string to echo to stdout
 * @param  style  String  An optional style name
 * @param  pad    Number  An optional pad value
 * @return Crawler
 */
Crawler.prototype.echo = function(text, style, pad) {
	if (!style) {
		style = 'TRACE';
	}
	this.casper.echo(text, style, pad);
	return this;
};

/**
 * Logs a message.
 *
 * @param  message  String  The message to log
 * @param  level    String  The log message level (from Casper.logLevels property)
 * @param  space    String  Space from where the logged event occurred (default: "phantom")
 * @return Crawler
 */
Crawler.prototype.log = function (message, level, space) {
	this.casper.log(message, level, space);
	return this;
};

Crawler.prototype.exit = function(status) {
	this.casper.exit(status);
};

Crawler.prototype.terminate = function(message) {
	message = message || "That's all";
	this.casper.then(function() {
		this.log(message).exit();
	});
};

Crawler.prototype.ignore = function() {
	this.log("Ignore url " + this.casper.getCurrentUrl());
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
//	this.log("processSeedPage");

	this.processIndexPage();
};

/**
 * Process index page
 * */
Crawler.prototype.processIndexPage = function() {
	"use strict";
//	var file = "/tmp/monitor/index-" + indexPageCounter + ".png";

//	this.captureSelector(file, entityOptions.indexPageMainAreaSelector);

	// if this object has a crawler member, it's the casper object
	// if not, it's the crawler object
	// TODO : how to avoid this intrusion?
	var $ = this.crawler || this;

    $.log("Processing index page " + $.casper.getCurrentUrl());
	$.saveIndexPage();
	$.counter.indexPages++;

    $.collectDetailPageLinks();

    var limit = $.options.entity.page.index.limit;
    var next = $.options.entity.page.index.paginator.next;
	// don't go too far down the rabbit hole
	if ($.counter.indexPages >= limit || !next || !$.casper.exists(next)) {
		this.log("All done. Crawled : " + $.counter.indexPages + " index pages. Limit : " + limit);
		$.casper.then(function() {
			$.processDetailPages();
		});

		return;
	}

	$.echo("Requesting next page: " + $.counter.indexPages);

	// go to the next index page
	var url = $.casper.getCurrentUrl();
	$.casper.thenClick(next).then(function() {
		this.log("Clicked next page selector : " + next);

		this.waitFor(function () {
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
	"use strict";
	var mainArea = this.options.entity.page.index.main;
	var pageRegex = this.options.entity.page.detail.regex;

	if (!mainArea || !this.casper.exists(mainArea)) {
		this.log('No main area with selector ' + mainArea, 'warning');
		return;
	}

	/**
	 * Do we mean UrlRegex?
	 * */
	if (!pageRegex) {
		this.log('Invalid detail page regex', 'warning');
		return;
	}

    this.log('Try to extract links with regex ' + pageRegex + ' in area ' + mainArea);
	var links = this.casper.evaluate(function(selector, pageRegex) {
		return __warps__searchLinks(selector, pageRegex);
	}, mainArea, pageRegex);

	if (!links || links.length == 0) {
        this.log('No any detail links', 'warning');
		return;
	}
	
	this.data.detailPageLinks = this.data.detailPageLinks.concat(links);

	// make the array unique
	this.data.detailPageLinks = this.data.detailPageLinks.sort().filter(function(link, i, arr) {
		return (i == arr.indexOf(link));
	});

	this.log('Extracted ' + links.length + ' detail page links');
};

/**
 * Report current status
 * */
Crawler.prototype.report = function() {
	this.log("detail pages : " + this.counter.detailPages
		+ ", detail page links : " + this.data.detailPageLinks.length, "info");
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
	"use strict";
	// this can be crawler or casper
	// TODO : avoid the confusion
	var $ = this.crawler || this;

	$.report();

	var links = $.data.detailPageLinks;
	/** Random shuffle */
	links.sort(function (a, b) {
		return Math.random() > 0.5 ? -1 : 1;
	});
	/** Process detail page recursively */
	$.processDetailPageRecursive(links);
};

/**
 * Process detail page
 *
 * @params links array
 * */
Crawler.prototype.processDetailPageRecursive = function(links) {
	"use strict";
	var $ = this.crawler || this;
	var casper = $.casper;

	var count = ++$.counter.detailPages;

	if (links.length == 0) {
		$.log("All done.");
		return;
	}

	/** don't go too far down the rabbit hole */
	var limit = $.options.entity.page.detail.limit || 100;
	if (count > limit) {
		$.log("All done. Hit limit " + limit + ", " + (count - 1) + " detail pages are fetched.");
		return;
	}

	/** Pop up an url to process */
	var url = links.pop();
	// $.log('Fetching ' + count + "th page.");
	$.echo('The ' + count + 'th detail page : ' + url, 'COMMENT');

	/** Validate the url */
	if (!url || !url.match(/^http(.+)/i)) {
		$.log("Ignore invalid url " + url);

		return;
	}

	/** Open the detail page */
	casper.thenOpen(url, function() {
		casper.echo('Title: ' + this.getTitle(), 'COMMENT');
		// var file = "/tmp/satellite/detail-" + $.counter.detailPages + ".png";
		// casper.capture(file);
	});

	/** We wait for some time */
    var wait = $.options.entity.detailPageWaitTime = 5000;
    casper.then(function() {
		casper.wait(wait);
    });

	/** And then scroll to bottom to load the entire page */
	casper.then(function() {
		casper.scrollToBottom();
	});

	/** Now, we do something to show we are human being */
	casper.thenEvaluate(function() {
		__warps__visualizeHumanize();
	});

	/** Scroll back to top again to calculate element positions */
	casper.then(function() {
		casper.scrollTo(0, 0);
	});

	/** Now, we might want to load something else */
	casper.then(function() {
		casper.crawler.loadAjaxContent();
	});

	/** Capture interesting areas */
	casper.then(function() {
		casper.crawler.captureAreas();
	});

	/** Save the page */
	casper.then(function () {
		casper.crawler.saveDetailPage();
	});

	casper.thenBypassUnless(function() {
		// this.log(extractJustInTime);
		return casper.crawler.options.extract.justInTime;
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

	casper.then(function(response) {
		// casper.log('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
		// this.debugPage();
		// utils.dump(response);
		// autoExtractDetailPage.call(this);
	});

	/** Recursive process another url */
	casper.then(function () {
		$.processDetailPageRecursive(links);
	});
};

/**
 * Load lazy content
 * */
Crawler.prototype.loadAjaxContent = function() {
	"use strict";
	var $ = this.crawler || this;
	var casper = this.casper;

	var extractor = $.options.entity.page.detail.extractor;
	var requiredSelector = $.options.entity.page.detail.extractor.requiredSelector;
	var clicks = $.options.entity.page.detail.clicks || [null];
	var click = clicks[0];

	casper.thenBypassIf(function () {
		return click == null;
	});

	casper.then(function() {
		casper.scrollTo(click.area[0], click.area[1]);
		casper.log("We are now at " + JSON.stringify(click.area));
	});

	casper.thenClick(click.selector, function() {
		casper.log("Clicked " + click.selector);
	});

	casper.wait(1000);

	/** Now we might do some hacking if the hacker scripts exists */
	var hackerScripts = loadScript($.options.entity.page.detail.hacker.scripts);
	casper.thenEvaluate(function (hackerScripts) {
		if (hackerScripts) {
			eval(hackerScripts);
		}
	}, {hackerScripts : hackerScripts});

	// casper.waitForResource(/(.+)commentsList2(.+)/i, function then() {
	// 	casper.log("Key resource arrived");
	// }, function onTimeout() {
	// 	casper.log("Failed to load key resource");
	// });

	casper.thenClick(click.selector, function() {
		casper.log("Click " + click.selector + " once again.");
	});

	casper.waitForSelector(requiredSelector, function then() {
		var fields = casper.evaluate(function (extractor) {
			var fields = new WarpsDomExtractor(extractor).extract();
			return fields;
		}, extractor);

		utils.dump(fields);
	}, function onTimeout() {
		this.log("Failed to see " + requiredSelector, 'warning');
	}, 20 * 1000);
};

/**
 * Save index page
 * */
Crawler.prototype.saveIndexPage = function() {
	"use strict";
	var file = this.getIndexPageLocalPath();

	var content = this.casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	this.log("page saved in : " + file);
};

/**
 * Save detail page
 * */
Crawler.prototype.saveDetailPage = function() {
	"use strict";

	var file = this.getDetailPageLocalPath();

	// Note : can we do this in DOM?
	// Answer : probably NOT.
	// 1. change DOM in casper.evaluate does no work, every change on the DOM leads actual network actions
	// 2. using other static DOM tools leads to lower performance
	var content = this.casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	// replace all relative links to absolute links
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

	fs.write(file, content, 'w');

	fs.write("/tmp/satellite-last-file", file);

	this.log("page saved in : " + file);
};

/**
 * Capture page area, save the picture into local disk
 * */
Crawler.prototype.captureAreas = function() {
	"use strict";
	var captureOptions = this.options.entity.page.detail.capture;

	this.log("Capture some areas.");

	if (!captureOptions) {
		this.log("No capture options, ignore capturing.");

		return;
	}

	/** Get a path to save */
	var fileNameBase = this.getDetailPageLocalPath();
	for (var i = 0; i < captureOptions.length; ++i) {
		var captureArea = captureOptions[i];
		if (!this.casper.exists(captureArea.selector)) {
			continue;
		}

		this.captureArea(captureArea, fileNameBase);
	} // for
};

/**
 * Capture page area, save the picture to disk
 *
 * @param captureArea object
 * @param fileNameBase string
 * */
Crawler.prototype.captureArea = function(captureArea, fileNameBase) {
	var imagePath = fileNameBase + "." + captureArea.name + ".png";

	/** Capture selector the simple way */
	this.casper.captureSelector(imagePath, captureArea.selector);

	/**
	 * The code below need refine, so return immediately.
	 *
	 * We successfully used the code below to capture price information from ctrip.com before
	 * */
	if (true || captureArea.selector) {
		return;
	}

	/** Create a new element to hold the target capture area to avoid noise */
	this.casper.evaluate(function(captureAreaSelector) {
		__warps_createCaptureArea(captureAreaSelector);
	}, captureArea.selector);

	/** Now, we do the capturing */
	// var selectorParts = captureArea.selector.split(/\s+/);
	imagePath = fileNameBase + "." + captureArea.name + ".png";
	var captureTargetSelector = '.WarpsCaptureArea > div.holder';
	this.casper.captureSelector(imagePath, captureTargetSelector);

	/** Clean capture area */
	this.casper.thenEvaluate(function () {
		__warps_cleanCaptureArea();
	});

	/** TODO : Insert the captured image only with some pre-condition */
	this.casper.bypass(1);

	this.casper.thenEvaluate(function(nearBy, name, imagePath) {
		__warps_insertImage(nearBy, name, imagePath);
	}, captureArea.selector, captureArea.name, imagePath);
};

/**
 * Extract detail page using auto extraction API
 * */
Crawler.prototype.autoExtractDetailPage = function() {
	this.log('Extract detail page : ' + this.getCurrentUrl());
	this.casper.debugPage();

	// var file = "/tmp/satellite/extract-" + detailPageCounter + ".png";
	// this.capture(file);
};

Crawler.prototype.getIndexPageLocalPath = function(dir, domain, date, url) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");
	if (!url) url = this.casper.getCurrentUrl();

	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date +  "/index/" + fileName + ".html";

	return dir + "/" + path;
};

Crawler.prototype.getDetailPageLocalPath = function(dir, domain, date, url) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");
	if (!url) url = this.casper.getCurrentUrl();

	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date + "/detail/" + fileName + ".html";

	return dir + "/" + path;
};
