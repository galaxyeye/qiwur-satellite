var fs = require("fs");
var system = require("system");
var tasks = require('./tasks');
var utils = require('./utils');

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
        if (!utils.processArgs(cliConfig, this.argumentConfig)) {
            phantom.exit();
            return;
        }

        config = utils.mergeConfig(cliConfig, cliConfig.configFile);

    	utils.emitConfig(this.config, " ");

    	fs.touch(utils.getLockFile());

    	tasks.load(config, tasks.fetch, tasks);
    }
};

fetcher.run();

// 2m后强制退出程序
setTimeout(function () {
	console.log("fetcher timeout, resource did not saved");
	fs.remove(utils.getLockFile());
	phantom.exit(0);
}, 1000 * 60 * 2);
