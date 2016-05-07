var system = require("system");
var server = require('webserver').create();
var fs = require("fs");
var utils = require('././utils');
var logger = require('././logger');

var PHANTOMJS = "bin" + fs.separator + "phantomjs";

var tools = {
	saveHtml : function(url, content) {
		file = utils.getTemporaryFile(url);
		fs.write(file, content, 'w');
	}
};

var tagger = {

    config : {
        "port" : 19180,
        "serverPortBase" : 19080,
        "proxyProcessCount" : 10
    },

    fetcherConfig : null,

    status : 'notready',

    startWebServer : function() {
        var tagger = this;
        // 启动控制服务器
        var service = server.listen(this.config.port, function (request, response) {
            var cmd = request.url;

            var body = '';
            if (cmd == '/') {
                body = tagger.index();
            }
            else if (cmd == "/tag") {
            	var target = "http://item.yixun.com/item-553917.html";
        		file = utils.getTemporaryFile(request.url);
        		if (fs.exists(file)) {
        			body = fs.read(file);
        		}
        		else {
                	return tagger.forward(target, response);
        		}
            }
            else {
                body = tagger.execute(cmd.substring(1));
                if (body == 'unrecognized command') {
                    var path = utils.virtualPath2LocalPath(request.url);
                    if (fs.isFile(path)) {
                        body = tagger.get(path);
                    }
                }
	            if (!body) body = 'balabala';
            }

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
        var config = utils.loadConfig().tagger;
        this.config = config = require('./config').mergeConfig(this.config, config);

        this.startWebServer();

        console.log("satellite started, open http://127.0.0.1:" + config.port + " for administration");
    },

    execute: function(cmd) {
        var result = '';

        if (cmd == 'scrape') {
            result = this.scrape();
        }
        else if (cmd == 'quit') {
            result = this.quit();
        }
        else {
            result = 'unrecognized command';
        }

        return result;
    },

    index : function() {
        return fs.read(utils.docRoot() + fs.separator + 'tagger.htm', 'utf-8');
    },

    quit : function() {
        this.stop();

        this.status = 'quit';

        return "quiting";
    },

    get: function(localPath) {
        if (fs.exists(localPath)) {
            return fs.read(localPath, 'utf8');
        }
        return "";
    },

    scrape : function(localPath) {
        return "ready to scrape";
    },

    forward: function(url, response) {
        var responsed = false;
        var fetcher = require('./fetcher').create();
        fetcher.fetch(url, this.fetcherConfig, function(proxyResponse, page) {
            if (!page) {
                logger.error("page is closed, quit...");

                return;
            }

            if (responsed) {
                logger.error("response has already been sent back, quit...");

                return;
            }

            var content = page.content;
            tools.saveHtml(url, content);

            response.setHeader('Content-Length', content.length);
            response.statusCode = proxyResponse.status;
            response.write(content);

            logger.debug("response url : " + url +
            		", status : " + response.statusCode +
            		", content length : " + content.length);

            responsed = true;
            response.close();
        });
    },
};

tagger.run();
