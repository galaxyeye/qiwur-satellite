"use strict";

/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/
var require = patchRequire(require);
var fs = require("fs");
var system = require("system");
var utils = require('utils');

var configure = vendor('configure').create();
var logger = vendor('logger');

var casper;

var Fetcher = function Fetcher(options) {
    "use strict";

    /* eslint max-statements:0 */
    // init & checks
    if (!(this instanceof Fetcher)) {
        return new Fetcher(options);
    }
    this.defauts = {
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
    this.config = configure.mergeConfig(this.defauts, options.config);
    if (this.config.userAgentAliases[this.config.userAgent]) {
        this.config.userAgent = this.config.userAgentAliases[this.config.userAgent];
    }
    /** create a new casper/phantom.page environment */
    this.casper = require('casper').create({
        clientScripts : ['src/lib/client/dist/satellite.min.js'],
        pageSettings : {
            loadImages : true,
            loadPlugins : false
        },
        logLevel : "debug",
        // verbose : true,
        stepTimeout : 1 * 1000,
        timeout : 3 * 1000,
        userAgent : this.config.userAgent,
        onTimeout : function(timeout) {
            this.echo("timeout " + timeout);
        },
        onStepTimeout : function(timeout, stepNum) {
            this.echo("step timeout " + timeout + ", step " + stepNum);
        },
        onWaitTimeout : function(timeout) {
            this.echo("wait timeout " + timeout);
        }
    });
    this.casper.fetcher = this;
    casper = this.casper;
    this.initEnvent(this.casper);

    this.pageRequested = false;
    this.pageLoaded = false;
    this.pageClosed = false;

    this.scrollCount = 0;
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

        if (response.stage == 'end') {
            // logger.debug("#" + response.id + " loaded");
            // logger.debug("#" + response.id + " loaded \n" + JSON.stringify(response));
        }
    });
};

Fetcher.prototype.fetch = function(url, onContentComplete) {
    var fetcher = this;

    casper.start(url, function(response) {
        fetcher.mainResponse = utils.clone(response);
    }).then(function() {
        this.scrollToBottom();
    }).then(function () {
        this.scrollTo(0, 0);
    }).thenEvaluate(function () {
        __warps__visualizeHumanize();
    });

    // utils.dump(fetcher.mainResponse);

    casper.run(function() {
        onContentComplete(fetcher.mainResponse, this.page);
    });
};

/**
 *  TODO : configurable
 * */
Fetcher.prototype.lockNavigation = function () {
    // don't leave this url, all redirection will be handled by the server
    // RESEARCH : if we do not lock the navigation, the page seems to be rebuilt and lost
    // customer annotations, and if we lock the navigation, tmail seems return a redirection
    if (this.config.url.indexOf("tmall") != -1 || this.config.url.indexOf("taobao") != -1) {
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
