/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/

var fs = require("fs");
var system = require("system");
var utils = require('utils');

var configure = vendor('configure').create();
var sutils = vendor('sutils');
var logger = vendor('logger');

var httpClient = {
    config: false,

    run: function () {
		var args = phantom.satelliteArgs;
		if (args.length == 0) {
			console.log("usage : phantomjs [options] client.js url");
			phantom.exit(0);
		}

    	this.config = configure.loadConfig().fetcher;
    	var url = args[0];

		// utils.dump(this.config);
		
		var fetcher = vendor('fetcher').create({config : this.config});
    	fetcher.fetch(url, function(response, page) {
    		var file = sutils.getTemporaryFile(response.url);

			fs.write(file, page.content, 'w');

    		console.log("full page content has been saved in file : " + file);
        	phantom.exit();
    	});
    }
};

httpClient.run();
