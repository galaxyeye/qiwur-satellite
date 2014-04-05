var fs = require("fs");
var system = require("system");
var tasks = require('./tasks');
var utils = require('./utils');

// 爬取超时时间，如果超时，则放弃爬取
var FetchTimeout = 1000 * 60 * 2;

var fetcher = {
    argumentConfig : [
         {
             name: 'url',
             def: 'http://qiwur.com',
             req: true,
             desc: 'the URL of the app to fetch'
         },
         {
             name: 'configFile',
             def: 'config.json',
             req: false,
             desc: 'a local configuration file of further spider settings'
         },
    ],

    run: function () {
        var cliConfig = {};
        if (!utils.processArgs(cliConfig, fetcher.argumentConfig)) {
            phantom.exit();
            return;
        }

        config = utils.mergeConfig(cliConfig, cliConfig.configFile);

    	utils.emitConfig(config, " ");

    	// 创建文件锁
    	fs.touch(utils.getFetcherLockFile());

    	// 加载网页
    	tasks.load(config, tasks.fetch, tasks);

        // 等待退出
    	fetcher.waitForExit();
    },

	waitForExit: function() {
		// 超时后强制退出进程
		setTimeout(function () {
			console.log("fetcher timeout, resource might not be saved");
    		// 删除文件锁
			fs.remove(utils.getFetcherLockFile());
			phantom.exit(0);
		},
		FetchTimeout);
	}
};

fetcher.run();
