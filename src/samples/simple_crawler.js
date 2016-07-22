var utils = require('utils');
var fs = require('fs');
var logger = vendor('logger');

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

var configData = utils.mergeObjects(DefaultConf, config.loadConfig().fetcher);

// TODO : phantom.libraryPath seems no use
var casper = require("casper").create({
    clientScripts : ['./src/lib/client/dist/satellite.min.js'],
    pageSettings : {
        userAgent : "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0",
        loadPlugins : false,
        loadImages : false
    },
    viewportSize : {
        width: configData.viewportWidth,
        height: configData.viewportHeight
    },
    userAgent : configData.userAgent,
    logLevel : configData.logLevel,
    verbose : true,
    stepTimeout : 5000,
    timeout : 5000,
    onTimeout : function(timeout) {
        status = 'timeout';
        this.echo("timeout : " + timeout + ", status : " + this.status().currentHTTPStatus);
    },
    onStepTimeout : function(timeout, stepNum) {
        this.echo("timeout : " + timeout + ", step : " + stepNum + ", status : " + this.status().currentHTTPStatus);
    },
    onWaitTimeout : function(timeout) {
        this.echo("wait timeout : " + timeout + ", status : " + this.status().currentHTTPStatus);
    }
});

var events = vendor('events').create(casper);
var entity = config.loadSiteObject("mia.com");
var options = {'config' : configData, 'casper' : casper, 'entity' : entity};

var crawler = vendor("crawler").create(options);
console.log("Current directory : " + fs.workingDirectory);
crawler.start();
