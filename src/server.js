var page = require('webpage').create();
var server = require('webserver').create();
var system = require('system');
var fs = require('fs');

var utils = require('./utils');
var logger = require('./logger');

var httpServer = {

    serverConfig: false,

    fetcherConfig: false,

    handleHttpRequest: function(request, response) {
        console.log("handle http request");
        // console.log(JSON.stringify(request, null, 4));

        var body = "";
        response.statusCode = 200;
        var path = utils.virtualPath2LocalPath(request.url);

        if (fs.isFile(path)) {
            body = services.get(path);
        }
        else if (fs.isDirectory(path)) {
            body = services.list(path);
        }
        else {
            body = "404 error";
            response.statusCode = 404;
        }

        response.headers = {
            'Cache': 'no-cache',
            'Content-Type': 'text/html',
            'Connection': 'Keep-Alive',
            'Keep-Alive': 'timeout=5, max=100',
            'Content-Length': body.length
        };

        response.write(body);
        response.close();
    },

    handleProxyRequest: function(request, response) {
        console.log("handle proxy request, url : " + request.url);
        logger.debug("response : " + JSON.stringify(response));

        // TODO : ip black list check

        // TODO : target block list check

        // TODO : proxy loop check

        // TODO : anthorization

        // TODO : route : redirect or forward

        services.forward(request, response);
    },

    run : function() {
        var config = this.config = utils.loadConfig().server;
        if (system.args.length === 2) {
        	this.config.port = system.args[1];
        }

        var service = null;
        var isProxy = config.port.indexOf('p') !== -1;

        // 每一个请求会在一个单独的线程中执行
        // TODO : 在phontomjs环境中，mongoose是单线程执行的，需要进一步验证
        service = server.listen(config.port, {'keepAlive': true}, function (request, response) {
            logger.debug("----------------------received a request-------------------------");
            logger.debug(JSON.stringify(request));

            if (isProxy) {
                httpServer.handleProxyRequest(request, response);
            }
            else {
                httpServer.handleHttpRequest(request, response);
            }
        });

        if (service) {
            console.log('Web server running on port ' + config.port);
        } else {
            console.error('Error: Could not create web server listening on port ' + config.port);
            phantom.exit();
        }
    }
};

var services = {

    list: function(localPath) {
        console.log(localPath);

        var links = [];
        files = fs.list(localPath);
        for (var i = 0; i < files.length; ++i) {
            if (files[i] == "." || files[i] == "..") {
                continue;
            }

            var vp = utils.localPath2VirtualPath(localPath + fs.separator + files[i]);
            links.push(vp);
        }

        var html = "<html><title>" + "spider server" + "</title>";
        html += "<body><h1>files</h1>";
        html += "<div><a href='" + utils.parentVirtualPath(utils.localPath2VirtualPath(localPath)) + "'>parent directory</a></div>";
        html += "<ul>";
        for (var i in links) {
            if (links[i].length > 1) {
                html += "<li><a href='" + links[i] + "'>" + links[i].substr(1) + "</a></li>";
            }
        }
        html += "</ul></body></html>";

        return html;
    },

    get: function(localPath) {
        if (fs.exists(localPath)) {
            return fs.read(localPath);
        }
        return "";
    },

    remove: function(localPath) {
        if (fs.exists(localPath)) {
            fs.remove(localPath);
        }
    },

    // proxy server
    redirect: function(response, host) {
        response.statusCode = 301;

        response.headers = {'Location' : "http://" + host};

        response.close();
    },

    forward: function(request, response) {
        logger.debug("forward to : " + request.url);

        var responsed = false;
        var fetcher = require('./fetcher').create();
        fetcher.fetch(request.url, httpServer.fetcherConfig, function(proxyResponse, page) {
            if (responsed) {
                logger.debug("response has already been sent back, quit...");
                return;
            }

            if (!page) {
                logger.debug("page is closed, quit...");
                return;
            }

            logger.debug("forward for response : " + JSON.stringify(proxyResponse));
            logger.debug("page length : " + page.content.length);

            for (var i = 0; i < proxyResponse.headers.length; ++i) {
//                logger.debug("proxy response headers : " + JSON.stringify(proxyResponse.headers[i]));
                var name = proxyResponse.headers[i].name;
                var value = proxyResponse.headers[i].value;
                response.setHeader(name, value);
            }

            response.setHeader('Connection', 'Keep-Alive');
            // 客户端可以和proxy server保持20分钟的长连接，并且在20分钟内可以使用该连接发送最多1000次请求
            // 超时或者请求次数超过限制，则重现建立连接
            response.setHeader('Keep-Alive', 'timeout=1200, max=1000');
            response.setHeader('Content-Length', page.content.length);

            response.statusCode = proxyResponse.headers.status;

            var msg = "-----------------------response-------------------------\n";
            msg += "response : " + JSON.stringify(response) + "\n";
            msg += "response headers : " + JSON.stringify(response.headers) + "\n";
            logger.debug(msg);

            response.writeHead(response.statusCode, proxyResponse.headers);
            response.write(page.content);

            responsed = true;
            response.closeGracefully();
        });
    },
};

httpServer.run();
