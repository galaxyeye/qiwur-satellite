var fs = require("fs");
var utils = require('./utils');
var fetcher = require('./fetcher');

var httpClient = {
	argumentConfig : [
		{
			name : 'url',
			def : 'http://qiwur.com',
			req : false,
			desc : 'the target url to fetch if this program runs in standalone mode'
		}, 
	],

    config: false,

    run: function () {
    	this.config = utils.buildConfig(this.argumentConfig);

    	// 创建文件锁
    	fs.touch(utils.getFetcherLockFile());

    	fetcher.fetch(this.config.url, this.config, function(response, content) {
    		console.log(JSON.stringify(response));

    		file = utils.getTemporaryFile(response.url);

    		console.log("full page content has been saved in file : " + file);

    		fs.write(file, content, 'w');

    		fs.remove(utils.getFetcherLockFile());

        	phantom.exit();
    	});
    },
};

httpClient.run();
