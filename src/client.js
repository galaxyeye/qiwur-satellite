var fs = require("fs");
var system = require("system");
var utils = require('./utils');
var fetcher = require('./fetcher');
var logger = require('./logger');

var httpClient = {
    config: false,

    run: function () {
    	if (system.args.length < 2) {
    		console.log("usage : phantomjs [options] client.js url");
    		phantom.exit(0);
    	}

    	this.config = utils.loadConfig().fetcher;
    	this.config.url = system.args[1];

//        system.args.forEach(function (arg, i) {
//            console.log(i + ': ' + arg);
//        });

//    	console.log(JSON.stringify(this.config));

    	// 创建文件锁
    	fs.touch(utils.getFetcherLockFile());

    	fetcher.fetch(this.config.url, this.config, function(response, content) {
    		file = utils.getTemporaryFile(response.url);

    		console.log("full page content has been saved in file : " + file);

    		fs.write(file, content, 'w');

    		fs.remove(utils.getFetcherLockFile());

        	phantom.exit();
    	});
    },
};

httpClient.run();
