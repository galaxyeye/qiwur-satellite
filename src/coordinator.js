var process = require("child_process");
var fs = require("fs");
var utils = require('./utils');

var PHANTOMJS = "phantomjs";

var coordinator = {

	config : {
		"ServerPortBase" : 19080,
		"ProxyProcessCount" : 10,
		"ControlCenter" : "http://qiwur.com/satellite/controller"
	},

    run: function () {
        var config = utils.loadConfig().coordinator;
        this.config = config = utils.mergeConfig(this.config, config);
    },

	start : function() {

        // 启动代理服务器
        for (var i = 0; i < ProxyProcessCount; ++i) {
        	// p为后缀表示启动代理服务器(proxy server)
            process.execFile(PHANTOMJS, ["server.js", ServerPortBase + i + "p"], null, function(err, stdout, stderr) {
                console.error(stderr);
            });

            // write pid files
        }

        // 启动汇报器
        process.execFile(PHANTOMJS, ["reporter.js"], null, function(err, stdout, stderr) {
              console.error(stderr);

              // write pid files
        });

        // 启动更新器
        process.execFile(PHANTOMJS, ["updater.js"], null, function(err, stdout, stderr) {
              console.error(stderr);

              // write pid files
        });
	},

	stop : function() {
		// find pid files and send kill command
	}
};

coordinator.run();
