/**
 * Entity crawler module
 * */
var require = patchRequire(require);
var utils = require('utils');
var fs = require('fs');
var system = require("system");

exports.create = function create(options) {
	"use strict";
	return new Crawler(options);
};

/**
 * TODO : move to other modules
 * */
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
    "logLevel" : 'debug'
};

var DefaultSiteOptions = {
	extract : {
		justInTime : false,
		serivce : 'http://localhost:8082'
	}
};

var Crawler = function Crawler(options) {
    // "use strict";
    /*jshint maxstatements:40*/
    // init & checks
    if (!(this instanceof Crawler)) {
        return new Crawler(options);
    }

    this.config = utils.mergeObjects(DefaultConf, config.loadConfig().fetcher);

    this.casper = require("casper").create({
    	clientScripts : ['../lib.old/humanize.js', '../lib.old/visualize.js', '../lib.old/clientutils.js', '../lib.old/jquery-1.11.2.js'],
	    pageSettings : {
		    loadPlugins : false,
		    loadImages : false
	    },
	    viewportSize : {
		    width: this.config.viewportWidth,
		    height: this.config.viewportHeight
	    },
	    userAgent : this.config.userAgent,
	    logLevel : this.config.logLevel,
	    verbose : true
	});

    // for exclusive functions
    this.casper.crawler = this;

    // factories
    this.casper.cli = phantom.casperArgs;

    this.options = utils.mergeObjects(DefaultSiteOptions, options);

    this.counter = {
       	indexPages : 0,
       	detailPages : 0,
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
    	this.echo("start");

    	this.scrollToBottom();
    });

    this.casper.then(function() {
    	this.crawler.processSeedPage(seed);
    });

    this.casper.run(function() {
    	this.exit();
    });

	return this;
}

Crawler.prototype.onSelectorNotExists = function() {
	this.echo("No such selector available in this page.").exit();
}

Crawler.prototype.echo = function(text, style, pad) {
	this.casper.echo(text, style, pad);
	return this;
}

Crawler.prototype.exit = function(status) {
	this.casper.exit(status);
}

Crawler.prototype.terminate = function(message) {
	message = message || "That's all";
	this.casper.then(function() {
		this.echo(message).exit();		
	});
}

Crawler.prototype.ignore = function() {
	this.echo("Ignore url " + this.casper.getCurrentUrl());
}

Crawler.prototype.optionChecker = function() {
	var checker = require('./object_checker');
	checker.require(this.options.entity.page.index.limit);
	checker.require(this.options.entity.page.index.next);
}

/**
 * Process seed page
 * */
Crawler.prototype.processSeedPage = function() {
	this.echo("processSeedPage");

	this.processIndexPage();
}

/**
 * Process index page
 * */
Crawler.prototype.processIndexPage = function() {
//	var file = "/tmp/satellite/index-" + indexPageCounter + ".png";

//	this.captureSelector(file, entityOptions.indexPageMainAreaSelector);

	// if this object has a crawler member, it's the casper object
	// if not, it's the crawler object
	// TODO : how to avoid this intrusion?
	var $ = this.crawler || this;

	var limit = $.options.entity.page.index.limit;
	var next = $.options.entity.page.index.paginator.next;

	if ($.counter.indexPages >= limit) {
		$.collectDetailPageLinks();
	}

	// don't go too far down the rabbit hole
	if ($.counter.indexPages >= limit || !$.casper.exists(next)) {
		$.casper.then(function() {
			$.processDetailPages();
		});

		return;
	}

	$.counter.indexPages++;
	$.echo("requesting next page: " + $.counter.indexPages);

	// go to the next index page
	var url = $.casper.getCurrentUrl();
	$.casper.thenClick(next).then(function() {
		this.waitFor(function() {
			return url !== this.getCurrentUrl();
		}, // testFn
		$.processIndexPage, // then
		$.processDetailPages, // onTimeout
		10 * 1000); // timeout
	});
}

/**
 * Collect detail page links
 * */
Crawler.prototype.collectDetailPageLinks = function() {
	var links = this.casper.evaluate(function(selector, regex) {
		return __qiwur__searchLinks(selector, regex);
	}, this.options.entity.page.index.main, this.options.entity.page.detail.regex);

	if (!links || links.length == 0) {
		logger.warn("No any detail links");
		return;
	}

	this.data.detailPageLinks = this.data.detailPageLinks.concat(links);
	this.echo('Extracted ' + links.length + ' detail page links');
}

/**
 * Report current status
 * */
Crawler.prototype.report = function() {
	this.echo(this.counter.detailPages + ", " + this.data.detailPageLinks.length);
	utils.dump(this.data.detailPageLinks);
}

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
}

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

	casper.then(function() {
		this.scrollToBottom();
	});

//	this.wait(5000);

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
}

/**
 * Save index page
 * */
Crawler.prototype.saveIndexPage = function() {
	var file = this.config.cacheDirectory + "/web/index/" + this.options.entity.name + "/"
		+ "index-" + this.counter.indexPages + ".html";

	var content = this.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
}

/**
 * Save detail page
 * */
Crawler.prototype.saveDetailPage = function() {
	var fileName = getDetailPageLocalFileName(this.options.entity.name, this.casper.getCurrentUrl());
	var file = this.config.cacheDirectory + "/" + fileName;

	// Note : can we do this in DOM?
	// Answer : probably NOT.
	// 1. change DOM in casper.evaluate does no work, every change on the DOM leads actual network actions
	// 2. using other static DOM tools leads to lower performance
	var content = this.casper.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
	// replace all relative links to absolute links
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
}

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

			var fileName = getDetailPageLocalFileName(options.name, this.casper.getCurrentUrl());
			var relativeImagePath = fileName + "." + captureArea.name + ".png";
			var imagePath = this.config.cacheDirectory + "/" + relativeImagePath;
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
}

/**
 * Extract detail page using auto extraction API
 * */
Crawler.prototype.autoExtractDetailPage = function() {
	this.echo('Extract detail page : ' + this.getCurrentUrl());
	this.casper.debugPage();

	// var file = "/tmp/satellite/extract-" + detailPageCounter + ".png";
	// this.capture(file);
}

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

function getDetailPageLocalFileName(name, url) {
	var fileNumber = md5.hex_md5(url);

	var fileName = "web/detail/" + name + "/" + "detail-" + fileNumber + ".html";

	return fileName;
}
