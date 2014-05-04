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

    timer : false,

    serverProcesses : [],

    status : 'notready',

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
            logger.info(message);
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
            result = this.getStatus();
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
            // logger.info('execute command : ' + cmd);
        }

        return result;
    },

    index : function() {
        return fs.read(utils.docRoot() + fs.separator + 'index.htm', 'utf-8');
    },

    getStatus : function() {
    	var message = this.status;
    	if (this.status == 'started') {
            message = JSON.stringify(this.serverProcesses);
    	}

        return message;
    },

    report : function() {
        console.log('start report process');

        // 启动汇报器
        var child = process.spawn(PHANTOMJS, ["src/reporter.js"]);

        child.stdout.on("data", function (data) {
            logger.debug("data : " + data);
        });

        child.stderr.on("data", function (data) {
            logger.error("data : " + data);
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
        child.stderr.on("data", function (data) {
            if (data == 'terminate') {
                for (var i = 0; i < processes.length; ++i) {
                    var process = processes[i];
                    if (process.port == port) {
                        logger.info('terminate process : ' + JSON.stringify(process));
                        process.process.child.kill('SIGKILL');
                        process.process = false;
                    }
                }
            }
            else {
                logger.error(JSON.stringify(data));
            }
        });

        child.stdout.on("data", function (data) {
            logger.info("data : " + data);
        });

        return {"port" : port, "process" : {"pid" : child.pid, "child" : child}, "status" : "running"};
    },

    start : function() {
        if (this.status == 'started') {
            return 'proxy servers is already running';
        }

    	coordinator.status = 'notready';

        this.stopTimer();

        // TODO : use file for IPC, which seems to be more stable, especially, if the coordinator crashes, 
        // 
        // eg : 
	    // var serverProcesses = JSON.parse(fs.read(ServerProcessesFile));

        // 启动代理服务器
        for (var i = 0; i < this.config.proxyProcessCount; ++i) {
            var port = this.config.serverPortBase + i;
            var process = this.startProxyServer(port);
            this.serverProcesses.push(process);
        }

        var message = JSON.stringify(this.serverProcesses);
        logger.info(message);

        this.startTimer();

        return message;
    },

    startTimer : function() {
    	if (this.timer) {
    		return;
    	}

        var tick = 0;
        var restartInterval = 20;
        var reportInterval = 4; // report interval 4, 8, 16, 32, ...1024s
        var coordinator = this;
        var processes = this.serverProcesses;
        this.timer = setInterval(function() {
            ++tick;

            if (coordinator.status == 'notready' && (tick % 10 == 0)) {
            	coordinator.status = 'started';
            }

            if (coordinator.status == 'quit' && (tick % 10 == 0)) {
            	coordinator.stopTimer();
                phantom.exit();
            }

            var restartCount = 0;
            if (coordinator.status == 'started' && tick % (restartInterval / 2) == 0) {
                for (var i = 0; i < processes.length; ++i) {
                    var process = processes[i];

                    if (process.process === false) {
                        // mark as dead and start the next round
                        process.status = 'dead';
                    }

                    if (process.status == 'dead') {
                        logger.info("start process : " + JSON.stringify(process));
                        processes[i] = coordinator.startProxyServer(process.port);
                        ++restartCount;
                    }

                    // start one every time
                    if (restartCount > 0) {
                    	break;
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
    },

    stopTimer : function() {
        if (this.timer) {
        	clearInterval(this.timer);
        	this.timer = false;
        }
    },

    stop : function() {
        console.log('stop all processes');

        if (this.status !== 'started') {
            return 'proxy servers are not running';
        }

        this.status = 'stopped';

        // find pid files and send kill command
        for (var i = 0; i < this.serverProcesses.length; ++i) {
            var process = this.serverProcesses[i];
            if (process.process !== false) {
                process.process.child.kill('SIGKILL');
                process.process = false;

                logger.info('kill proxy process on port : ' + process.port);
            }
        }

        logger.info('all proxy servers are down');

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

        this.status = 'quit';

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
