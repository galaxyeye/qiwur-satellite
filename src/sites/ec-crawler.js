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

console.log("Current directory : " + fs.workingDirectory);

// register customer events
include("src/sites/detail/ecommerce_events.js");
var casperEvents = new CasperEvents();
var entity = configure.loadSiteObject("jd.com", "config/sites/jd.com.json");
var options = {config : config, entity : entity, casperEvents : casperEvents};

var crawler = vendor("crawler").create(options);
crawler.start();
