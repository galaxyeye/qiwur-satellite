var system = require("system");
var fs = require("fs");
var utils = require('utils');
var sutils = vendor('sutils');
var md5 = vendor("md5");
var logger = vendor('logger');
var configure = vendor('configure').create();

utils.dump(configure);
console.log(JSON.stringify(configure));
configure.test();
utils.dump(configure.loadConfig());

// var config = window.config.loadConfig().fetchController;

var entity = configure.loadSiteObject("academic.microsoft.com", "tests/resources/config/sites.json");

utils.dump(entity);

phantom.exit(0);
