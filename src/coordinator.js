"use strict";

/* global __utils__, CasperError, console, exports, phantom, patchRequire, require:true */

var process = require("child_process");
var system = require("system");
var utils = require("utils");
var server = require('webserver').create();
var fs = require("fs");

var sutils = vendor('sutils');
var logger = vendor('logger');
var configure = vendor('configure').create();

var MONITOR = fs.workingDirectory + fs.separator + "bin" + fs.separator + "monitor";

var Coordinator = function Coordinator(options) {
    // init & checks
    if (!(this instanceof Coordinator)) {
        return new Coordinator(options);
    }

    this.config = {
        "port" : 19180,
            "serverPortBase" : 19080,
            "monitoredProcessCount" : 10,
            "fetchMode" : "crowdsourcing"
    };

    this.timer = false;

    this.monitoredProcesses  = [];

    this.status  = 'notready';
}

Coordinator.prototype.startWebServer = function() {
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
                var path = sutils.virtualPath2LocalPath(request.url);

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
};

Coordinator.prototype.run = function () {
    var config = configure.loadConfig().coordinator;
    this.config = config = configure.mergeConfig(this.config, config);

    this.startWebServer();

    var cmd = "";
    var args = phantom.satelliteArgs;
    if (args.length > 0) {
        cmd = args[0];
    }

    logger.info('=============================');
    logger.info('coordinator command : ' + cmd);

    if (cmd == 'start') this.start();
    else if (cmd == 'update') this.update();
    else if (cmd == 'report') this.report();

    logger.info("monitor started, open http://127.0.0.1:" + config.port + " for administration");
};

Coordinator.prototype.execute = function(cmd) {
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
};

Coordinator.prototype.index = function() {
    return fs.read(sutils.docRoot() + fs.separator + 'index.htm', 'utf-8');
};

Coordinator.prototype.getStatus = function() {
    var message = this.status;
    if (this.status == 'started') {
        message = JSON.stringify(this.monitoredProcesses);
    }

    return message;
};

Coordinator.prototype.report = function() {
    console.log('start report process');

    // 启动汇报器
    var child = process.spawn(MONITOR, ["src/reporter.js"]);

    child.stdout.on("data", function (data) {
        logger.debug("data : " + data);
    });

    child.stderr.on("data", function (data) {
        logger.error("data : " + data);
    });

    return 'status reported to the server';
};

Coordinator.prototype.update = function() {
    console.log('start updater');

    // 启动更新器
    process.execFile(MONITOR, ["src/updater.js"], null, function(err, stdout, stderr) {
        console.error(stderr);
    });

    return 'updated....';
};

/**
 * Start fetcher client, the fetcher client asks the fetch server for tasks,
 * download the web page and then upload it back to the fetch server.
 *
 * @param port a dummy number to indicate the process
 * */
Coordinator.prototype.startFetcherClient = function(clientId) {
    logger.info("starting fetcher client");

    var child = process.spawn(MONITOR, ["src/satellite.js"]);

    var processes = this.monitoredProcesses;
    child.stderr.on("data", function (data) {
        if (data == 'terminate') {
            for (var i = 0; i < processes.length; ++i) {
                var process = processes[i];
                if (process.port == clientId) {
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
        logger.info("information from fetcher client process : " + data);
    });

    logger.info("fetcher client is started");

    return {"port" : clientId, "process" : {"pid" : child.pid, "child" : child}, "status" : "running"};
};

Coordinator.prototype.start = function() {
    var THIS = this;

    if (THIS.status == 'started') {
        return 'coordinator is already running';
    }

    THIS.status = 'notready';

    THIS.stopTimer();

    // TODO : use file for IPC, which seems to be more stable, especially, if the coordinator crashes
    // eg :
    // var monitoredProcesses = JSON.parse(fs.read(ServerProcessesFile));
    // 启动代理服务器或卫星客户端
    for (var i = 0; i < THIS.config.monitoredProcessCount; ++i) {
        var process = process = THIS.startFetcherClient(i);

        if (process) {
            THIS.monitoredProcesses.push(process);
        }
    }

    var message = JSON.stringify(THIS.monitoredProcesses);
    logger.info(message);

    THIS.startTimer();

    return message;
};

Coordinator.prototype.startTimer = function() {
    var THIS = this;

    if (THIS.timer) {
        return;
    }

    var tick = 0;
    var restartInterval = 20;
    var reportInterval = 4; // report interval 4, 8, 16, 32, ...1024s
    var THIS = this;
    var processes = this.monitoredProcesses;
    this.timer = setInterval(function() {
        ++tick;

        if (THIS.status == 'notready' && (tick % 10 == 0)) {
            THIS.status = 'started';
        }

        if (THIS.status == 'quit' && (tick % 10 == 0)) {
            THIS.stopTimer();
            phantom.exit();
        }

        var restartCount = 0;
        if (THIS.status == 'started' && tick % (restartInterval / 2) == 0) {
            for (var i = 0; i < processes.length; ++i) {
                var process = processes[i];

                if (process.process === false) {
                    // mark as dead and start the next round
                    process.status = 'dead';
                }

                if (process.status == 'dead') {
                    logger.info("process is dead. process information : " + JSON.stringify(process));
                    logger.info("try to restart it");
                    processes[i] = THIS.startFetcherClient(process.port);
                    ++restartCount;
                }

                // start one every time
                if (restartCount > 0) {
                    break;
                }
            } // for
        } // if

        if (tick % reportInterval == 0) {
            THIS.report();
            reportInterval *= 2;
            // about 20 minites
            if (reportInterval >= 1024) {
                reportInterval = 1024;
            }
        } // if
    }, 1000);
};

Coordinator.prototype.stopTimer = function() {
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = false;
    }
};

Coordinator.prototype.stop = function() {
    console.log('stop all processes');

    if (this.status !== 'started') {
        return 'proxy servers are not running';
    }

    this.status = 'stopped';

    // find pid files and send kill command
    for (var i = 0; i < this.monitoredProcesses.length; ++i) {
        var process = this.monitoredProcesses[i];
        if (process.process !== false) {
            process.process.child.kill('SIGKILL');
            process.process = false;

            logger.info('kill proxy process on port : ' + process.port);
        }
    }

    logger.info('all proxy servers are down');

    return 'all proxy servers are down';
};

Coordinator.prototype.restart = function() {
    var THIS = this;

    var message = this.stop();

    message += '<br />';
    setTimeout(function () {
        message += THIS.start();
    }, 10 * 1000);

    return message;
};

Coordinator.prototype.quit = function() {
    this.stop();

    this.status = 'quit';

    return "quiting";
};

Coordinator.prototype.get = function(localPath) {
    if (fs.exists(localPath)) {
        return fs.read(localPath, 'utf-8');
    }
    return "";
};

var coordinator = new Coordinator();
coordinator.run();
