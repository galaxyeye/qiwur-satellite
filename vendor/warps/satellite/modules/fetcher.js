"use strict";

/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/
var require = patchRequire(require);
var fs = require("fs");
var system = require("system");
var utils = require('utils');

var configure = vendor('configure').create();
var logger = vendor('logger');

var DefaultConfig = {
    "userAgent": "firefox",
    "userAgentAliases": {
        "chrome" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11",
        "firefox" : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0"
    },
    "fetchTimeout" : 30 * 1000,
    "scrollCount" : 10,
    "scrollTimeout" : 5 * 1000,
    "consolePrefix": "#",
    "viewportWidth": 1920,
    "viewportHeight": 1080
};

var DefaultScrollInterval = 500; // ms

var Fetcher = function Fetcher(options) {
    "use strict";

    /* eslint max-statements:0 */
    // init & checks
    if (!(this instanceof Fetcher)) {
        return new Fetcher(options);
    }

    /* create a new casper/phantom.page environment */
    this.casper = require('casper').create({
        clientScripts : ['src/lib/client/dist/satellite.min.js'],
        pageSettings : {
            loadImages : true,
            loadPlugins : false
        },
        logLevel : "debug",
        // verbose : true,
        stepTimeout : 5000,
        timeout : 5000,
        onTimeout : function(timeout) {
            this.echo("timeout " + timeout);
        },
        onStepTimeout : function(timeout, stepNum) {
            this.echo("timeout " + timeout + ", stepNum " + stepNum);
        },
        onWaitTimeout : function(timeout) {
            this.echo("wait timeout " + timeout);
        }
    });

    this.casper.fetcher = this;

    this.page = this.casper.page;

    this.initEnvent(this.casper);

    this.config = configure.mergeConfig(DefaultConfig, options.config);
    if (this.config.userAgentAliases[this.config.userAgent]) {
        this.config.userAgent = this.config.userAgentAliases[this.config.userAgent];
    }
    this.casper.options.userAgent = this.config.userAgent;

    this.pageRequested = false;
    this.pageLoaded = false;
    this.pageClosed = false;

    this.scrollCount = 0;
    this.scrollInterval = false;
    this.lastScrollTime = new Date().getTime();
    this.ajaxRequests = 0;
    this.ajaxResponses = 0;
    this.mainResponse = false;
};

/*******************************************************************************
 * network events
 ******************************************************************************/
Fetcher.prototype.initEnvent = function(casper) {
    // var events = vendor('events').create(casper);

    casper.on('resource.requested', function(requestData, networkRequest) {
        // logger.debug('Request (#' + requestData.id + ')');
        // logger.debug('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));

        if (this.fetcher.pageLoaded) {
            ++this.fetcher.ajaxRequests;
        }
    });

    casper.on('resource.received', function(response) {
        // this.echo("received : " + response.url);

        if (!this.fetcher.mainResponse) {
            // logger.debug("main response : " + JSON.stringify(response));
            this.fetcher.mainResponse = response;
        }

        if (response.stage == 'end') {
            // logger.debug("#" + response.id + " loaded");
            // logger.debug("#" + response.id + " loaded \n" + JSON.stringify(response));
        }

        if (this.fetcher.pageLoaded && response.stage == 'end') {
            ++this.fetcher.ajaxResponses;
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
};

Fetcher.prototype.fetch = function(url, onContentComplete) {
    var fetcher = this;

    this.casper.start(url).then(function() {

    }).then(function() {
        fetcher.processPage();
    }).then(function() {
        // logger.debug("content complete in fetcher");
        // logger.debug(JSON.stringify(response));
        //
        // response.close();
    });

    this.casper.run(function() {
        // this.echo("all done.");
        onContentComplete(fetcher.mainResponse, this.page);
    });
};

Fetcher.prototype.processPage = function() {
    // open detail page
    // this.casper.thenOpen(url, function() {
    //     this.echo('Detail page title: ' + this.getTitle());
    //     var file = "/tmp/monitor/detail-" + detailPageCounter + ".png";
    //     this.capture(file);
    // });

    this.casper.then(function() {
        this.scrollToBottom();
    });

    this.casper.wait(1000);

    // Scroll to top again to calculate original element positions
    this.casper.then(function() {
        this.scrollTo(0, 0);
    });

    // humanize and visualize
    this.casper.thenEvaluate(function() {
        __warps__visualizeHumanize();
    });

    this.casper.then(function() {
        // captureAreas.call(this);
    });

    // cache page content
    this.casper.then(function () {
        // saveDetailPage.call(this);
    });

    this.casper.thenBypassUnless(function() {
        return this.fetcher.config.extractJustInTime;
    }, 1);

    // post to extract server
    // this.casper.thenOpen(conf.extractSerivce, {
    //     method : 'post',
    //     headers : {
    //         'Content-Type' : 'application/json'
    //     },
    //     data : {
    //         html : this.getHTML(),
    //         format : 'All'
    //     }
    // });

    // this.casper.waitFor(function() {
    //      return url !== this.getCurrentUrl();
    // })

    this.casper.then(function(response) {
        this.echo('Extract Result : ' + this.getCurrentUrl() + ' - ' + this.getTitle());
        // this.debugPage();
        // utils.dump(response);
        // autoExtractDetailPage.call(this);
    });

    this.casper.then(function() {
        // processDetailPages.call(this);
    });
};

Fetcher.prototype.lockNavigation = function () {
    // don't leave this url, all redirection will be handled by the server
    // RESEARCH : if we do not lock the navigation, the page seems to be rebuilt and lost
    // customer annotations, and if we lock the navigation, tmail seems return a redirection
    if (config.url.indexOf("tmall") != -1 || config.url.indexOf("taobao") != -1) {
        // tmail/taobao Temporarily Moved to login page, and then redirect back
        // TODO : find a general solution to handle redirect
        page.navigationLocked = false;
    }
    else {
        page.navigationLocked = true;
    }
};

Fetcher.prototype.pageStatus = function() {
    return 'requested : ' + this.pageRequested + ', loaded : '
        + this.pageLoaded + ', closed : ' + this.pageClosed;
};

exports.create = function(options) {
    "use strict";

    return new Fetcher(options);
};
