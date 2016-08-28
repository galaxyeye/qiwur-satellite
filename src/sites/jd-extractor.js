"use strict";

var utils = require('utils');
var fs = require('fs');

var logger = vendor('logger');
var configure = vendor('configure').create();

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

var config = configure.mergeConfig(DefaultConf, configure.loadConfig().fetcher);

// TODO : phantom.libraryPath seems no use
var casper = require("casper").create({
    clientScripts : ['./src/lib/client/dist/satellite.min.js'],
    pageSettings : {
        userAgent : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0",
        loadPlugins : false,
        loadImages : false
    },
    viewportSize : {
        width: config.viewportWidth,
        height: config.viewportHeight
    },
    logLevel : config.logLevel,
    verbose : true,
    stepTimeout : 5000,
    timeout : 5000,
    onTimeout : function(timeout) {
        // default behavior is exit the script?
        this.echo("timeout " + timeout);
    },
    onStepTimeout : function(timeout, stepNum) {
        this.echo("timeout " + timeout + ", stepNum " + stepNum);
    },
    onWaitTimeout : function(timeout) {
        this.echo("wait timeout " + timeout);
    }
});

// register customer events
include("src/sites/detail/local_resource_events.js");
var events = new EventRegister(casper);
var entity = configure.loadSiteObject("jd.com", "config/sites/jd.com.json");
var options = {'config' : config, 'casper' : casper, 'entity' : entity, 'extractor' : entity.page.detail.extractor};
var limit = 3;

var resourceDir = "/home/vincent/Data/warps/satellite/web/jd.com/08.24/detail";

// Get a list all files in directory
var uris = [];
fs.list(resourceDir).filter(function (uri) {
    return uri.indexOf("html") > 0 && !fs.isFile(uri);
}).forEach(function(uri) {
    uris.push(resourceDir + "/" + uri);
});

// casper.echo(JSON.stringify(entity));
// casper.exit(0);

casper.start("about:blank", function() {
    extractDocument.call(this, uris);
});

var i = 0;
var extractDocument = function(uris) {
    if (uris.length == 0) {
        return;
    }

    if (i++ >= limit) {
        this.echo("Hit limit " + limit + ", exit.");
        return;
    }

    var uri = uris.pop();

    this.echo("\n");
    this.echo("Process the " + i + "th document: " + uri, 'COMMENT');

    this.thenOpen(uri, function() {
        this.evaluate(function (extractor) {
            // __utils__.echo(document.baseURI);
            var fields = new WarpsDomExtractor(extractor).extract();
            __utils__.echo(JSON.stringify(fields));
        }, {extractor : options.extractor});
    }).then(function () {
        extractDocument.call(this, uris);
    });
};

casper.run(function() {
    this.exit(0);
});
