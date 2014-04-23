var process = require("child_process");
var system = require("system");
var server = require('webserver').create();
var fs = require("fs");
var utils = require('./utils');
var logger = require('./logger');

var PHANTOMJS = "bin/phantomjs";

var coordinator = {

	config : {
		"port" : 19180,
		"serverPortBase" : 19080,
		"proxyProcessCount" : 10,
		"controlCenter" : "http://qiwur.com:19181"
	},

	serverProcesses : [],

    startWebServer : function() {
    	var services = this;
		// 启动控制服务器
		var service = server.listen(this.config.port, function (request, response) {
			var cmd = request.url;

	        var body = '';
			if (cmd == '/') {
				body = services.index();
			}
			else {
				body = services.execute(cmd.substring(1));
			}

			if (!body) body = 'ok';
	        response.statusCode = 200;
	        response.headers = {
	            'Cache': 'no-cache',
	            'Content-Type': 'text/html',
	            'Content-Length': body.length
	        };

	        response.write(body);
	        response.close();
        });

        if (service) {
            console.log('Web server running on port ' + this.config.port);
        } else {
            console.error('Error: Could not create web server listening on port ' + this.config.port);
            phantom.exit();
        }
    },

    run: function () {
        var config = utils.loadConfig().coordinator;
        this.config = config = utils.mergeConfig(this.config, config);

		this.startWebServer();

        var cmd = '';
    	if (system.args.length > 1) {
    		cmd = system.args[1];
    	}

    	if (cmd == 'start') this.start();
    	else if (cmd == 'update') this.update();
    	else if (cmd == 'stop') this.stop();
    },

    execute: function(cmd) {
        var result = '';

        logger.info('execute command : ' + cmd);

		if (cmd == 'status') {
			result = this.status();
		}
		else if (cmd == 'report') {
			result = this.report();
		}
		else if (cmd == 'update') {
			result = this.update();
		}
		else if (cmd == 'start') {
			result = this.start();
		}
		else if (cmd == 'restart') {
			result = this.restart();
		}
		else if (cmd == 'stop') {
			this.stop();
		}

		return result;
    },

    index : function() {
    	return fs.read('web/index.htm');
    },

    status : function() {
    	return 'not implemented';
    },

    report : function() {
    	console.log('start report process');

        // 启动汇报器
        var child = process.spawn(PHANTOMJS, ["src/reporter.js"]);

        child.stdout.on("data", function (data) {
        	logger.debug(JSON.stringify(data));
        });

        child.stderr.on("data", function (data) {
        	logger.error(JSON.stringify(data));
        });

        return 'status reported to the server';
    },

	update : function() {
    	console.log('start updater');

        // 启动更新器
        process.execFile(PHANTOMJS, ["src/updater.js"], null, function(err, stdout, stderr) {
              console.error(stderr);
        });

        return 'updated....';
	},

	start : function() {
		var message = 'start proxy servers on port : ';

        // 启动代理服务器
        for (var i = 0; i < this.config.proxyProcessCount; ++i) {
        	var port = this.config.serverPortBase + i + "p";

        	console.log('start proxy process on port : ' + port);
        	message += port + ', ';

        	// p为后缀表示启动代理服务器(proxy server)
            var child = process.spawn(PHANTOMJS, ["src/server.js", port]);

            child.stdout.on("data", function (data) {
            	logger.debug(JSON.stringify(data));
            });

            child.stderr.on("data", function (data) {
            	logger.error(JSON.stringify(data));
            });

            this.serverProcesses.push(child);
        }

        var services = this;

        setTimeout(function () {
        	services.report();
        }, 20 * 1000);

        // report status periodly
        setInterval(function() {
        	services.report();
        }, this.config.reportPeriod);

        message += ' all done.';
        return message;
	},

	stop : function() {
    	console.log('stop all processes');

		// find pid files and send kill command
		for (var i = 0; i < this.serverProcesses.length; ++i) {
	    	console.log('kill proxy process');

			this.serverProcesses[i].kill('SIGKILL');
		}

    	console.log('all proxy servers are down');

    	return 'all done.';
	},

	restart : function() {
		var message = this.stop();

		message += '<br />';
        setTimeout(function () {
        	message += this.start();
        }, 10 * 1000);

    	return message;
	}
};

coordinator.run();
