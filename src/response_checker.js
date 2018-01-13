/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/

var fs = require("fs");
var utils = require('utils');
var configure = vendor('configure').create();

var args = system.args;
if (args.length === 0) {
	console.log("usage : monitor src/response.js url");
	phantom.exit(0);
}

var config = configure.loadConfig().fetcher;
var url = args[0];
var statusOutput = "tmp/last-response-status";
var contentOutput = "tmp/last-page-body";

fs.write(statusOutput, "", "w");
fs.write(contentOutput, "", "w");

var fetcher = vendor('fetcher').create({config : config});
fetcher.fetch(url, function(response, page) {
	response.bodySize = page.content.length;
	fs.write(statusOutput, utils.serialize(response, 4), "w");
	fs.write(contentOutput, page.content, "w");
	phantom.exit();
});
