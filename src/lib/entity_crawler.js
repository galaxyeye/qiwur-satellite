/**
 * Entity crawler module
 * */
// var require = patchRequire(require);

var config = require('./config');
var sateutils = require('./utils');
var md5 = require('./md5');
var logger = require('./logger');

// must be load after casper is loaded
var require = patchRequire(require);

var fs = require("fs");
var system = require("system");
var utils = require('utils');

exports.create = function create(options) {
    "use strict";
    return new EntityCrawler(options);
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
    "logLevel" : 'debug',

    "scentServer" : "http://localhost:8181",
    "extractSerivce" : "http://localhost:8181/scent/extract",
    "extractJustInTime" : false
};

var EntityCrawler = function EntityCrawler(options) {
    "use strict";
    /*jshint maxstatements:40*/
    // init & checks
    if (!(this instanceof EntityCrawler)) {
        return new EntityCrawler(options);
    }

    // factories
    // casper.cli = phantom.casperArgs;
    // casper.options = utils.mergeObjects(this.defaults, options);

    this.config = config.mergeConfig(DefaultConf, config.loadConfig().fetcher);

    // merge?
    // this.options = options;

    this.casper = require("casper").create({
    	clientScripts : ['../lib/humanize.js', '../lib/visualize.js', '../lib/clientutils.js', '../lib/jquery-1.11.2.js'],
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

    // TODO : load from config file
    this.entityOptions = {
        "name" : "tuan.ctrip.com",
        "seed" : "http://tuan.ctrip.com/group/city_shanghai/item_6/page_1",
        "indexPageMainAreaSelector" : ".pic-list",
        "paginatorSelector" : ".page-box",
        "nextPageSelector" : ".page-box .page-next",
        "startPage" : 1,
        "detailPageUrlRegex" : "http://tuan.ctrip.com/group/(.+)",
        "maxIndexPageCount" : 3,
        "maxDetailPageCount" : 100,
        "detailPageCaptureAreas" : [
          {"name" : "Price", "selector" : ".detail-info .price-set .price"}
        ]
    };

    this.options = {
    	entity : {
    	    name : "tuan.ctrip.com",
    	    seed : "http://tuan.ctrip.com/group/city_shanghai/item_6/page_1",
    	    page : {
        	    index : {
        	    	main : '.pic-list',
        	    	paginator : {
        	    		'selector' : '.page-box',
        	    		'next' : '.page-box .page-next'
        	    	},
        	    	start : 1,
        	    	limit : 3
        	    },
        	    detail : {
        	    	regex : 'http://tuan.ctrip.com/group/(.+)',
        	    	start : 1,
        	    	limit : 100,
        	    	capture : {
        	    		name : 'Price',
        	    		selector : '.detail-info .price-set .price'
        	    	}
        	    }
    	    },
//    	    "indexPageMainAreaSelector" : ".pic-list",
//    	    "paginatorSelector" : ".page-box",
//    	    "nextPageSelector" : ".page-box .page-next",
//    	    "startPage" : 1,
//    	    "detailPageUrlRegex" : "http://tuan.ctrip.com/group/(.+)",
//    	    "maxIndexPageCount" : 3,
//    	    "maxDetailPageCount" : 100,
//    	    "detailPageCaptureAreas" : [
//    	        {"name" : "Price", "selector" : ".detail-info .price-set .price"}
//    	    ]
    	},

    	extract : {
    		justInTime : false,
    		serivce : 'http://localhost:8082'
    	}
    };

    this.counter = {
       	indexPages : 0,
       	detailPages : 0,
    };

    this.data = {
   		detailPageLinks : []
    };

//    this.indexPageCounter = 0,
//    this.detailPageLinks = [],
//    this.detailPageCounter = 0,
//    this.extractJustInTime = false

    // dispatching an event when instance has been constructed
    // this.emit('init');
};

EntityCrawler.prototype.echo = function(text, style, pad) {
	this.casper.echo(text, style, pad);
	return this;
}

EntityCrawler.prototype.exit = function(status) {
	this.casper.exit(status);
};

EntityCrawler.prototype.start = function(seed) {
    "use strict";

    if (!this.options.entity) {
    	logger.error('no entity specified');
    	this.die('no entity specified');
    }

    var seed = this.options.entity.seed;
    this.casper.start(seed).then(function() {
//    	if (status == 'timeout') {
//    		terminate.call(this);
//    	}

    	this.echo("start");

    	this.scrollToBottom();
    });

    this.casper.then(function() {
    	// _THIS.processSeedPage();
    	this.crawler.processPage(seed);
    });

//    var entityOptions = this.options.entity;
//    var onSelectorNotExists = this.onSelectorNotExists;
//
//    this.casper.then(function() {
//    	this.waitForSelector(entityOptions.paginatorSelector, entityOptions.processIndexPages, onSelectorNotExists);
//    });

    this.casper.run(function() {
    	this.exit();
    });

	return this;
};

EntityCrawler.prototype.onSelectorNotExists = function() {
	this.echo("No such selector available in this page.").exit();
};

EntityCrawler.prototype.terminate = function() {
	this.echo("That's all, folks.").exit();
};

EntityCrawler.prototype.ignore = function() {
	this.echo("Ignore url " + this.casper.getCurrentUrl());
};

EntityCrawler.prototype.processPage = function() {
	this.echo("processPage");

	this.processIndexPages();
}

EntityCrawler.prototype.processSeedPage = function() {
	this.echo("processSeedPage");

	this.processIndexPages();
}

EntityCrawler.prototype.processIndexPages = function() {
//	var file = "/tmp/satellite/index-" + indexPageCounter + ".png";

//	this.captureSelector(file, entityOptions.indexPageMainAreaSelector);

	// if this object has a crawler member, it's the casper object
	// if not, it's the crawler object
	// TODO : how to avoid this intrusion?
	var $ = this.crawler || this;

	var limit = $.options.entity.page.index.limit;
	if ($.counter.indexPages >= limit) {
		$.collectDetailPageLinks();
	}

	// don't go too far down the rabbit hole
	var limit = $.options.entity.page.index.limit;
	var next = $.options.entity.page.index.paginator.next;

//	this.echo('processIndexPages　' + limit + ' ' + next);
//	utils.dump($.counter);

	if ($.counter.indexPages >= limit || !$.casper.exists(next)) {
		$.casper.then(function() {
			this.echo("==========Start processing detail pages=================");

			$.processDetailPages();
		});

		return;
	}

	$.counter.indexPages++;
	$.echo("requesting next page: " + $.counter.indexPages);
	var url = $.casper.getCurrentUrl();
	$.casper.thenClick(next).then(function() {
		this.waitFor(function() {
			return url !== this.getCurrentUrl();
		}, // testFn
		$.processIndexPages, // then
		$.processDetailPages, // onTimeout
		10 * 1000); // timeout
	});
};

EntityCrawler.prototype.collectDetailPageLinks = function() {
	this.echo('====collectDetailPageLinks　' + this.counter.indexPages + ' ' + this.options.entity.startPage);

	if (this.counter.indexPages < this.options.entity.startPage) {
		return;
	}

	var links = this.casper.evaluate(function(selector, regex) {
		return __qiwur__searchLinks(selector, regex);
	}, this.options.entity.page.index.main, this.options.entity.page.detail.regex);

	if (!links || links.length == 0) {
		logger.warn("No any detail links");
	}

	if (links) {
		this.data.detailPageLinks = this.data.detailPageLinks.concat(links);
		this.echo(links.length + ' detail page links');

//		for (var i = 0; i < links.length; ++i) {
//			this.echo('Found detail page links : ' + links[i]);
//		}
	}
	else {
		this.echo('***NO*** detail page links');
	}
};

EntityCrawler.prototype.processDetailPages = function() {
	var $ = this.crawler || this;

	$.echo($.counter.detailPages + ", " + $.data.detailPageLinks.length);
	for (var i = 0; i < $.data.detailPageLinks.length; ++i) {
		$.echo('Detail page : ' + $.data.detailPageLinks[i]);
	}

	// don't go too far down the rabbit hole
	if ($.counter.detailPages > $.options.entity.page.detail.limit
			|| $.counter.detailPages > $.data.detailPageLinks.length) {
		$.casper.then(function() {
			this.terminate();
		});

		return;
	}

	$.counter.detailPages++;
	// var url = _.detailPageLinks.pop();
	var url = $.data.detailPageLinks[$.counter.detailPages - 1];
	$.echo($.counter.detailPages + 'th detail page : ' + url);

	if (url) {
		$.processDetailPage(url);
	}
	else {
		$.echo('invalid url');			
	}
};

EntityCrawler.prototype.processDetailPage = function(url) {
	var $ = this.crawler || this;
	var casper = $.casper;

	// open detail page
	casper.thenOpen(url, function() {
		this.echo('Detail page title: ' + this.getTitle());
		var file = "/tmp/satellite/detail-" + $.detailPageCounter + ".png";
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

	casper.then(function() {
		this.crawler.processDetailPages();
	});
};

EntityCrawler.prototype.saveIndexPage = function() {
	var file = this.config.cacheDirectory + "/web/detail/" + this.options.entity.name + "/"
		+ "index-" + this.counter.indexPages + ".html";

	var content = this.getHTML().replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

	fs.write(file, content, 'w');

	this.echo("page saved in : " + file);
}

EntityCrawler.prototype.saveDetailPage = function() {
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

EntityCrawler.prototype.captureAreas = function() {
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

EntityCrawler.prototype.autoExtractDetailPage = function() {
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

function getDetailPageLocalFileName(entityName, url) {
	var fileNumber = md5.hex_md5(url);

	var fileName = "web/detail/" + entityName + "/" + "detail-" + fileNumber + ".html";

	return fileName;
}
