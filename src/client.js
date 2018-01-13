/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/
require("./bootstrap");

var fs = require("fs");
var sutils = vendor('sutils');

var config = vendor('configure').create().loadConfig().fetcher;
var fetcher = vendor('fetcher').create({config : config});
var casper = fetcher.casper;

var url = casper.cli.get(0);
if (!url) {
	console.log("Usage : bin/monitor [options] client.js url");
	phantom.exit(0);
}

// utils.dump(config);

fetcher.fetch(url, function(response, page) {
	var file = sutils.getTemporaryFile(response.url);
	fs.write(file, page.content, 'w');
	console.log("Response status : " + response.status + ", " + response.statusText + ", saved in " + file);
	phantom.exit();
});
