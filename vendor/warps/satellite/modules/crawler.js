"use strict";

/** global __utils__, CasperError, console, exports, phantom, patchRequire, require:true */

/**
 * Entity crawler module
 * */
var require = patchRequire(require);
var utils = require('utils');
var fs = require('fs');
var system = require("system");

var logger = vendor("logger");
var md5 = vendor("md5");

var CrawlerTasks = ['index-detail', 'index', 'detail', 'clean', 'showLinks'];
var casper;

exports.create = function create(options) {
	"use strict";

	return new Crawler(options);
};

/**
 * TODO : move casper outside the file
 * */
var Crawler = function Crawler(options) {
	"use strict";

	// init & checks
	if (!(this instanceof Crawler)) {
		return new Crawler(options);
	}
	this.defaults = {
		extract : {
			justInTime : false,
			serivce : 'http://localhost:8082'
		}
	};
	this.startTime = new Date();
    this.options = utils.mergeObjects(this.defaults, options);
	this.config = options.config;
	this.finished = false;

	/** Program options processing */
	var args = phantom.casperArgs.args;
	if (args.length == 0) {
		this.printUsage();
		this.exit(0);
	}

	this.task = "index-detail";
	this.task = args[0];
	if (CrawlerTasks.indexOf(this.task) === -1) {
		this.printUsage();
		this.exit(0);
	}

	if (args.length > 0) {
		this.detailPageSeedFile = args[1];
	}

	casper = this.createCasper(this.options);

	this.counter = {
		indexPages : 0,
		detailPages : 0
	};

	/** Program data cache */
    this.data = {
		indexPageLinks : [],
		detailPageLinks : []
	};
};

Crawler.prototype.createCasper = function(options) {
	var casper = require("casper").create({
		clientScripts : ['src/lib/client/dist/satellite.min.js'],
		pageSettings : {
			userAgent : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0",
			loadPlugins : false,
			loadImages : false
		},
		viewportSize : {
			width: this.config.viewportWidth,
			height: this.config.viewportHeight
		},
		logLevel : this.config.logLevel,
		verbose : true,
		stepTimeout : 1 * 1000,
		timeout : 3 * 1000,
		onTimeout : function(timeout) {
			this.echo("Timeout " + timeout);
		},
		onStepTimeout : function(timeout, stepNum) {
			this.echo("Step timeout " + timeout + ", stepNum " + stepNum);
		},
		onWaitTimeout : function(timeout) {
			this.echo("Wait timeout " + timeout);
		}
	});
	this.options.casperEvents.registerTo(casper);
	// for exclusive functions
	casper.crawler = this;

	return casper;
};

Crawler.prototype.printUsage = function() {
	this.echo("Uage : crawler task [detailPageSeeds]");
	this.echo("Tasks must be one of " + CrawlerTasks.join(", "));
};

Crawler.prototype.start = function() {
	"use strict";

	if (!this.options.entity.name) {
		logger.error('no entity specified, exit...');
		this.die('no entity specified, exit...');
	}

	/** Utility tasks */
	var file = this.getDetailPageLinksOutputPath();
	if (this.task == 'clean') {
		fs.write(file, "", "w");
		this.echo("Clean detail page links output path " + file);
		this.exit(0);
	}
	else if (this.task == 'showLinks') {
		var links = this.loadDetailLinks();
		utils.dump(links);
		this.exit(0);
	}

	var $ = this;
	casper.start("about:blank", function() {
		if ($.task == 'detail') {
			$.processDetailPages();
		}
		else {
			$.processSeedPage();
		}
	});

	casper.run(function() {
		casper.exit(0);
	});

	return this;
};

/**
 * Check if we should crawl detail pages
 *
 * @return {Boolean}
 * */
Crawler.prototype.hasDetailPageTask = function() {
	return this.task.indexOf('detail') !== -1;
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
	var $ = this.crawler || this;

	var seed = $.options.entity.seed;
	casper.open(seed).then(function() {
		$.processIndexPage();
	});
};

/**
 * Process index page
 * */
Crawler.prototype.processIndexPage = function() {
	"use strict";
	// var file = "/tmp/monitor/index-" + indexPageCounter + ".png";
	// this.captureSelector(file, entityOptions.indexPageMainAreaSelector);

	// if this object has a crawler member, it's the casper object
	// if not, it's the crawler object
	var $ = this.crawler || this;

	var limit = $.options.entity.page.index.limit;
	var next = $.options.entity.page.index.paginator.next;
	var count = ++$.counter.indexPages;

	// don't go too far down the rabbit hole
	if (count >= limit || !next) {
		this.log("All done. Crawled " + count + " index pages. Limit : " + limit + ", next selector : " + next);
		$.finishIndexPageTask();
	}

	$.log("\n");
	$.log("-------------------------------------");
	$.log("Processing the " + count + "th index page");

	/** scroll to bottom and wait for ajax content */
	casper.repeat(10, function () {
		casper.scrollToBottom().then(function() {
			casper.scrollTo(0, 0);
			casper.wait(0.5 * 1000);
		});
	});

	casper.waitForSelector(next, function then() {
		$.saveIndexPage();
		$.collectPageLinks();
	}, function onTimeout() {
		$.log("No next selector " + next + ", exit.");
		$.finishIndexPageTask();
	}, 2 * 1000);

	var url = casper.getCurrentUrl();
	$.data.indexPageLinks.push(url);
	// go to the next index page
	casper.thenClick(next).then(function() {
		casper.waitFor(function () {
			return url !== casper.getCurrentUrl();
		}, // testFn
		function then() {
			$.processIndexPage();
		},
		function onTimeout() {
			casper.log("Can not see new pages after next selector clicked");
			$.finishIndexPageTask();
		},
		10 * 1000); // timeout
	});
};

Crawler.prototype.finishIndexPageTask = function() {
	this.finished = true;
	this.saveIndexLinks(this.data.indexPageLinks);
	this.saveIndexPage();
	this.collectPageLinks();

	if (this.hasDetailPageTask()) {
		this.processDetailPages();
	}
};

/**
 * Collect detail page links
 * */
Crawler.prototype.collectPageLinks = function() {
	"use strict";

	var mainArea = this.options.entity.page.index.main;
	var pageRegex = this.options.entity.page.detail.regex;

	if (!mainArea || !casper.exists(mainArea)) {
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
	var links = casper.evaluate(function(selector, pageRegex) {
		return __warps__searchLinks(selector, pageRegex);
	}, mainArea, pageRegex);

	if (!links || links.length == 0) {
        this.log('No any detail links', 'warning');
		return;
	}

	this.data.detailPageLinks = this.data.detailPageLinks.concat(links);

	this.log('Extracted ' + links.length + ' detail page links');

	this.saveDetailLinks(links);
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

	// var links = $.data.detailPageLinks;
	var links = $.loadDetailLinks();
	// make the array unique
	links = links.sort().filter(function(link, i, arr) {
		return (link && link.length > 0 && i == arr.indexOf(link));
	});

	if (!links || links.length == 0) {
		$.log("No detail links to process, exit...");
		casper.exit(0);
		return;
	}

	/** Random shuffle */
	links.sort(function () {
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
	var metadata = [];

	// $.log('Fetching ' + count + "th page.");
	$.echo('The ' + count + 'th detail page : ' + url, 'COMMENT');

	/** Validate the url */
	if (!url || !url.match(/^http(.+)/i)) {
		$.log("Ignore invalid url " + url);
		return $.processDetailPageRecursive(links);
	}

	if ($.checkPageAlreadyExtracted(url)) {
		$.log("Ignore already extracted url " + url);
		return $.processDetailPageRecursive(links);
	}

	/** Open the detail page */
	casper.thenOpen(url, function(response) {
		casper.echo('Title: ' + this.getTitle(), 'COMMENT');
		metadata = response;
		metadata.data = null;
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
		$.loadAjaxContent();
	});

	/** Extract content */
	var extractor = $.options.entity.page.detail.extractor;
	var requiredSelector = $.options.entity.page.detail.extractor.requiredSelector;
	casper.waitForSelector(requiredSelector, function then() {
		var fields = casper.evaluate(function (extractor) {
			var fields = new WarpsDomExtractor(extractor, null).extract(null);
			return fields;
		}, extractor);
		fields.push({name : "response", value : metadata});
		$.saveExtractResult(fields);
	}, function onTimeout() {
		this.log("Failed to see " + requiredSelector, 'warning');
	}, 20 * 1000);

	/** Capture interesting areas */
	casper.then(function() {
		$.captureAreas();
	});

	/** Save the page */
	casper.then(function () {
		$.saveDetailPage();
	});

	casper.thenBypassUnless(function() {
		// this.log(extractJustInTime);
		return $.options.extract.justInTime;
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
};

/**
 * Check if the page is already extracted
 *
 * TODO : use a extracted url list
 *
 * @param url {String}
 * */
Crawler.prototype.checkPageAlreadyExtracted = function (url) {
	"use strict";

	var dir = this.config.cacheDirectory;
	var domain = this.options.entity.name;
	var date = this.startTime.pattern("MM.dd");

	var file = this.getExtractResultLocalPath(dir, domain, date, url);

	this.echo("------------------");
	this.echo(file);

	return fs.exists(file);
};

/**
 * Save index links into disk
 *
 * @param links {Array} links
 * */
Crawler.prototype.saveIndexLinks = function(links) {
	"use strict";

	var file = this.getIndexPageLinksOutputPath();

	// make the array unique
	links = links.sort().filter(function(link, i, arr) {
		return (link && link.length > 0 && i == arr.indexOf(link));
	});

	links.forEach(function(link) {
		fs.write(file, link + '\n', 'a+');
	});

	this.log(links.length + " index page links saved in : " + file);
};

/**
 * Load index links from disk
 *
 * @return {Array} links
 * */
Crawler.prototype.loadIndexLinks = function() {
	"use strict";
	var file = this.detailIndexSeedFile ? this.detailIndexSeedFile : this.getIndexPageLinksOutputPath();

	var links = fs.read(file);
	links = links.split('\n');

	// TODO : read some

	this.log("Loaded " + links.length + " index page links from file : " + file);

	return links;
};

/**
 * Save detail links into disk
 *
 * @param links {Array} links
 * */
Crawler.prototype.saveDetailLinks = function(links) {
	"use strict";

	var file = this.getDetailPageLinksOutputPath();

	// make the array unique
	links = links.sort().filter(function(link, i, arr) {
		return (link && link.length > 0 && i == arr.indexOf(link));
	});

	links.forEach(function(link) {
		fs.write(file, link + '\n', 'a+');
	});

	this.log(links.length + " detail page links saved in : " + file);
};

/**
 * Save detail links into disk
 *
 * @return {Array} links
 * */
Crawler.prototype.loadDetailLinks = function() {
	"use strict";
	var file = this.detailPageSeedFile ? this.detailPageSeedFile : this.getDetailPageLinksOutputPath();

	var links = fs.read(file);
	links = links.split('\n');

	// TODO : read some

	this.log("Loaded " + links.length + " detail page links from file : " + file);

	return links;
};

/**
 * Save index page
 * */
Crawler.prototype.saveIndexPage = function() {
	"use strict";
	var file = this.getIndexPageLocalPath();

	var content = casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	fs.write("tmp/last-index-file", file);

	this.log("Index page is saved in : " + file);
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
	var content = casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	// replace all relative links to absolute links
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

	fs.write(file, content, 'w');

	fs.write("tmp/last-detail-file", file);

	this.log("Detail page is saved in : " + file);
};

/**
 * Save extract result
 * @param fields {Array}
 * */
Crawler.prototype.saveExtractResult = function(fields) {
	"use strict";

	var file = this.getExtractResultLocalPath();

	// var content = JSON.stringify(fields, 4);
	var content = utils.serialize(fields, 4);

	fs.write(file, content + '\n', 'w');

	fs.write("tmp/last-extract-result", file);

	this.log("Extract result is saved in : " + file);
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
		if (!casper.exists(captureArea.selector)) {
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
	casper.captureSelector(imagePath, captureArea.selector);

	/**
	 * The code below need refine, so return immediately.
	 *
	 * We successfully used the code below to capture price information from ctrip.com before
	 * */
	if (true || captureArea.selector) {
		return;
	}

	/** Create a new element to hold the target capture area to avoid noise */
	casper.evaluate(function(captureAreaSelector) {
		__warps_createCaptureArea(captureAreaSelector);
	}, captureArea.selector);

	/** Now, we do the capturing */
	// var selectorParts = captureArea.selector.split(/\s+/);
	imagePath = fileNameBase + "." + captureArea.name + ".png";
	var captureTargetSelector = '.WarpsCaptureArea > div.holder';
	casper.captureSelector(imagePath, captureTargetSelector);

	/** Clean capture area */
	casper.thenEvaluate(function () {
		__warps_cleanCaptureArea();
	});

	/** TODO : Insert the captured image only with some pre-condition */
	casper.bypass(1);

	casper.thenEvaluate(function(nearBy, name, imagePath) {
		__warps_insertImage(nearBy, name, imagePath);
	}, captureArea.selector, captureArea.name, imagePath);
};

/**
 * Extract detail page using auto extraction API
 * */
Crawler.prototype.autoExtractDetailPage = function() {
	this.log('Extract detail page : ' + this.getCurrentUrl());
	casper.debugPage();

	// var file = "/tmp/satellite/extract-" + detailPageCounter + ".png";
	// this.capture(file);
};

/**
 * Get index page local path
 * */
Crawler.prototype.getIndexPageLocalPath = function(dir, domain, date, url) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");
	if (!url) url = casper.getCurrentUrl();

	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date +  "/index/" + fileName + ".html";

	return dir + "/" + path;
};

/**
 * Get index links file path
 * */
Crawler.prototype.getIndexPageLinksOutputPath = function(dir, domain, date) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");

	var path = "web/" + domain + "/" + date + "/index/links.txt";

	return dir + "/" + path;
};

/**
 * Get detail links file path
 * */
Crawler.prototype.getDetailPageLinksOutputPath = function(dir, domain, date) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");

	var path = "web/" + domain + "/" + date + "/detail/links.txt";

	return dir + "/" + path;
};

/**
 * Get detail page local path
 * */
Crawler.prototype.getDetailPageLocalPath = function(dir, domain, date, url) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");
	if (!url) url = casper.getCurrentUrl();

	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date + "/detail/" + fileName + ".html";

	return dir + "/" + path;
};

/**
 * Get detail page local path
 * */
Crawler.prototype.getExtractResultLocalPath = function(dir, domain, date, url) {
	if (!dir) dir = this.config.cacheDirectory;
	if (!domain) domain = this.options.entity.name;
	if (!date) date = this.startTime.pattern("MM.dd");
	if (!url) url = casper.getCurrentUrl();

	var fileName = md5.hex_md5(url);

	var path = "web/" + domain + "/" + date + "/detail/" + fileName + ".json";

	return dir + "/" + path;
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
	casper.echo(text, style, pad);
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
	casper.log(message, level, space);
	return this;
};

Crawler.prototype.exit = function(status) {
	phantom.exit(status);
};

Crawler.prototype.terminate = function(message) {
	message = message || "That's all";
	casper.then(function() {
		this.log(message).exit();
	});
};

Crawler.prototype.ignore = function() {
	this.log("Ignore url " + casper.getCurrentUrl());
};

