var process = require("child_process");
var system = require("system");
var server = require('webserver').create();
var fs = require("fs");
var utils = require('./utils');
var logger = require('./logger');

var PHANTOMJS = "bin" + fs.separator + "phantomjs";

var coordinator = {

	config : {
		"port" : 19180,
		"serverPortBase" : 19080,
		"proxyProcessCount" : 10
	},

	serverProcesses : [],

    startWebServer : function() {
    	var coordinator = this;
		// 启动控制服务器
		var service = server.listen(this.config.port, function (request, response) {
			var cmd = request.url;

	        var body = '';
			if (cmd == '/') {
				body = coordinator.index();
			}
			else {
				body = coordinator.execute(cmd.substring(1));
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
        	var message = 'web server running on port ' + this.config.port;
            console.log(message);
            logger.debug(message);
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
    	var message = 'proxy servers : ' + JSON.stringify(this.serverProcesses);
    	return message;
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

	startProxyServer: function(port) {
    	// p为后缀表示启动代理服务器(proxy server)
        var child = process.spawn(PHANTOMJS, ["src/server.js", port + "p"]);

        child.stdout.on("data", function (data) {
        	logger.debug(JSON.stringify(data));
        });

        child.stderr.on("data", function (data) {
        	logger.error(JSON.stringify(data));
        });

        return {"port" : port, "process" : child, "status" : "running"};
	},

	start : function() {
		var message = "";

        // 启动代理服务器
        for (var i = 0; i < this.config.proxyProcessCount; ++i) {
        	var port = this.config.serverPortBase + i;
        	var process = this.startProxyServer(port);
            this.serverProcesses.push(process);
        }

		logger.debug("all proxy servers : " + JSON.stringify(this.serverProcesses));

        var tick = 0;
        var restartInterval = 6;
        var reportInterval = 4; // report interval 4s, 8, 16, 32, ...
        var coordinator = this;
        var processes = this.serverProcesses;
        setInterval(function() {
        	++tick;

        	if (tick % (restartInterval / 2) == 0) {
	    		for (var i = 0; i < processes.length; ++i) {
					var process = processes[i];

					if (process.process.pid === 0) {
						if (process.process.status == 'dead') {
			    			logger.info("start process : " + JSON.stringify(process));
			    			processes[i] = coordinator.startProxyServer(process.port);							
						}
						else {
							// mark as dead and we will restart it the next round
							process.process.status = 'dead';
						}
					} // if
	    		} // for
        	} // if

        	if (tick % reportInterval == 0) {
        		coordinator.report();
        		reportInterval *= 2;
        		// about 20 minites
        		if (reportInterval >= 1024) {
        			reportInterval = 1024;
        		}
        	} // if
        }, 1000);

        message += ' all done.';
        return message;
	},

	stop : function() {
    	console.log('stop all processes');

		// find pid files and send kill command
		for (var i = 0; i < this.serverProcesses.length; ++i) {
    		var process = this.serverProcesses[i].process;
    		var port = this.serverProcesses[i].port;

			process.kill('SIGKILL');

	    	console.log('kill proxy process on port : ' + port);
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
