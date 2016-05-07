var utils = require('utils');
var fs = require('fs');
var system = require("system");

require(fs.absolute("bootstrap"));

var logger = vendor('logger');

for (var field in require) {
    utils.dump(field + " : " + require[field]);
}

var entity = config.loadSiteObject("tuan.ctrip.com");
// // var crawler = new Crawler({'entity' : entity});
var crawler = vendor("crawler").create({'entity' : entity});
console.log("Current directory : " + fs.workingDirectory);
crawler.start();
