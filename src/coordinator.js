var process = require("child_process");
var system = require("system");
var server = require('webserver').create();
var fs = require("fs");
var utils = require('./utils');
var logger = require('./logger');

var PHANTOMJS = "bin" + fs.separator + "phantomjs";
var quit = false;

var coordinator = {

    config : {
        "port" : 19180,
        "serverPortBase" : 19080,
        "proxyProcessCount" : 10
    },

    startWorkerInterval : false,

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
                if (body == 'unrecognized command') {
                    var path = utils.virtualPath2LocalPath(request.url);

                    if (fs.isFile(path)) {
                        body = coordinator.get(path);
                    }
                }
            }

            if (!body) body = 'ok';

            response.statusCode = 200;
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
        else if (cmd == 'report') this.report();

        console.log("satellite started, open http://127.0.0.1:" + config.port + " for administration");
    },

    execute: function(cmd) {
        var result = '';

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
        	result = this.stop();
        }
        else if (cmd == 'quit') {
        	result = this.quit();
        }
        else {
        	result = 'unrecognized command';
        }

        if (result != 'unrecognized command') {
            logger.info('execute command : ' + cmd);
        }

        return result;
    },

    index : function() {
        return fs.read(utils.docRoot() + fs.separator + 'index.htm', 'utf-8');
    },

    status : function() {
        var message = 'free ports : ' + JSON.stringify(this.serverProcesses);
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

        var processes = this.serverProcesses;
        child.stdout.on("data", function (data) {
            logger.debug(JSON.stringify(data));

            if (data == 'terminate\r\n') {
	    		for (var i = 0; i < processes.length; ++i) {
					var process = processes[i];
					if (process.port == port) {
		                logger.info('terminate process : ' + JSON.stringify(process));
						process.process.child.kill();
						process.process = false;
					}
	    		}
            }
        });

        child.stderr.on("data", function (data) {
            logger.error(JSON.stringify(data));
        });

        return {"port" : port, "process" : {"pid" : child.pid, "child" : child}, "status" : "running"};
    },

    start : function() {
        // 启动代理服务器
        for (var i = 0; i < this.config.proxyProcessCount; ++i) {
            var port = this.config.serverPortBase + i;
            var process = this.startProxyServer(port);
            this.serverProcesses.push(process);
        }

        var message = ""; // "all proxy servers : " + JSON.stringify(this.serverProcesses);
        logger.info(message);

        var tick = 0;
        var restartInterval = 20;
        var reportInterval = 8; // report interval 8s, 16, 32, ...1024s
        var coordinator = this;
        var processes = this.serverProcesses;
        this.startWorkerInterval = setInterval(function() {
            ++tick;

            if (tick % (restartInterval / 2) == 0) {
	    		for (var i = 0; i < processes.length; ++i) {
					var process = processes[i];

					if (process.process === false) {
						// mark as dead and start the next round
						process.status = 'dead';
					}

					if (process.status == 'dead') {
		    			logger.info("start process : " + JSON.stringify(process));
		    			processes[i] = coordinator.startProxyServer(process.port);
					}
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

        return message;
    },

    stop : function() {
        console.log('stop all processes');

        // find pid files and send kill command
        for (var i = 0; i < this.serverProcesses.length; ++i) {
            var process = this.serverProcesses[i];
        	if (process.process !== false) {
        		process.process.child.kill();

                console.log('kill proxy process on port : ' + process.port);
        	}
        }

        console.log('all proxy servers are down');

        return 'all proxy servers are down';
    },

    restart : function() {
        var message = this.stop();

        message += '<br />';
        setTimeout(function () {
            message += this.start();
        }, 10 * 1000);

        return message;
    }, 

    quit : function() {
        this.stop();
        quit = true;

        return "quiting";
    },

    get: function(localPath) {
        if (fs.exists(localPath)) {
            return fs.read(localPath, 'utf-8');
        }
        return "";
    }
};

coordinator.run();

setInterval(function() {
    if (quit) {
        phantom.exit(0);
    }
}, 10 * 1000);
