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
include("src/samples/detail/ecommerce_events.js");
var events = new CasperEventRegister(casper);
var entity = configure.loadSiteObject("jd.com");
var options = {'config' : config, 'casper' : casper, 'entity' : entity};

var crawler = vendor("crawler").create(options);
console.log("Current directory : " + fs.workingDirectory);
crawler.start();
