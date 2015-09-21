var page = require('webpage').create();
var server = require('webserver').create();
var system = require('system');
var fs = require('fs');

var utils = require('./lib/utils');
var logger = require('./logger');

var quit = false;

var httpServer = {

    serverConfig : false,

    fetcherConfig : false,

    servedPages : 0,

    run : function() {
        var config = this.config = require('./config').loadConfig().server;
        if (system.args.length === 2) {
        	this.config.port = system.args[1];
        }

        var service = null;
        var isProxy = config.port.indexOf('p') !== -1;
        var keepAlive = config.keepAlive;

        logger.info('start a server at port ' + config.port);

        // 每一个请求会在一个单独的线程中执行
        // TODO : 在phontomjs环境中，mongoose是单线程执行的，需要进一步验证
        service = server.listen(config.port, {'keepAlive': keepAlive}, function (request, response) {
//            logger.debug("----------------------received a request-------------------------");
//            logger.debug(JSON.stringify(request));

        	if (quit) {
        		response.statusCode = 503;
                response.setHeader('Retry-After', 60);
        		response.closeGracefully();

        		return;
        	}

            if (isProxy) {
                httpServer.handleProxyRequest(request, response);
            }
            else {
                httpServer.handleHttpRequest(request, response);
            }
        });

        if (service) {
            logger.info('web server running on port ' + config.port);
        } else {
        	logger.error('Error: Could not create web server listening on port ' + config.port);
            phantom.exit();
        }
    },

    stop : function() {
    	server.close();
    },

    handleHttpRequest : function(request, response) {
        logger.debug("handle http request");
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
        // console.log("handle proxy request, url : " + request.url);
        // logger.info("handle proxy request, url : " + request.url);
        // logger.debug("prepared response : " + JSON.stringify(response));

        // TODO : ip black list check

        // TODO : target block list check

        // TODO : proxy loop check

        // TODO : anthorization

        // TODO : route : redirect or forward

        services.forward(request, response);
    }
};

// services should have no member properties, it's stateless
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
            return fs.read(localPath, 'utf8');
        }
        return "";
    },

    remove: function(localPath) {
        if (fs.exists(localPath)) {
            fs.remove(localPath);
        }
    },

    report: function() {
    	
    },

    // proxy server
    redirect: function(response, host) {
        response.statusCode = 301;

        response.headers = {'Location' : "http://" + host};

        response.close();
    },

    forward: function(request, response) {
        // logger.debug("forward to : " + request.url);

        var responsed = false;
        var fetcher = require('./fetcher').create();
        fetcher.fetch(request.url, httpServer.fetcherConfig, function(proxyResponse, page) {
            if (!page) {
                logger.error("page is closed, quit...");

                return;
            }

            if (responsed) {
                logger.error("response has already been sent back, quit...");

                return;
            }

            var content = page.content;
        	content = content.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

            // logger.debug("forward for response : " + JSON.stringify(proxyResponse));
        	// logger.debug("page length : " + page.content.length);

            // 将目标网站的响应头部复制一遍，注意某些头部是不再适用的，Content-Encoding，Content-MD5, Transfer-Encoding等
            // copy all responses from the target web server
            // NOTICE : some headers are not applicable, such as Content-Encoding，Content-MD5, Transfer-Encoding, etc
            // TODO : check more applicable headers
            var ForwardHeaders = ['Server', 'Content-Type', 'Content-Language', 'X-Powered-By',
                                  'Location',
                                  'Set-Cookie', 'Vary', 'Date',
                                  'X-Cache', 'X-Cache-Lookup',
                                  'Cache-Control', 'Last-Modified', 'Expires'];
            // var DoNotForwardHeaders = ['Content-Encoding', 'Content-MD5', 'Transfer-Encoding'];
            for (var i = 0; i < proxyResponse.headers.length; ++i) {
                var name = proxyResponse.headers[i].name;
                var value = proxyResponse.headers[i].value;

                if (ForwardHeaders.indexOf(name) !== -1) {
                	// nutch seeks a "\n\t" or "\n " as a line continue mark
                	// but it seems that some response header use only '\n' for a line continue mark
                	value = value.replace(/\n\t*/g, "\n\t");
                	if (name == 'Content-Type') {
                		// the content encoding is utf-8 now for all pages
                		value = value.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
                	}

                    response.setHeader(name, value);
                }
            }

            // 客户端可以和proxy server保持20分钟的长连接，并且在20分钟内可以使用该连接发送最多1000次请求
            // 超时或者请求次数超过限制，则重现建立连接
            if (httpServer.serverConfig.keepAlive) {
                response.setHeader('Connection', 'Keep-Alive');
                response.setHeader('Keep-Alive', 'timeout=1200, max=1000');
            }
            response.setHeader('Content-Length', content.length);
            // TODO ： gzip压缩。如果使用gzip压缩，则需要设置Content-Encoding头部信息。
            // TODO ： Transfer-Encoding

//            var msg = "-----------------------response-------------------------\n";
//            msg += "response : " + JSON.stringify(response) + "\n";
//            logger.debug(msg);

            // TODO : consider redirect algorithm again
            response.statusCode = proxyResponse.status;
            // response.statusCode = 200;
            response.writeHead(response.statusCode, response.headers);
            response.write(content);

            ++httpServer.servedPages;

            logger.debug("response url : " + request.url +
            		", status : " + response.statusCode +
            		", content length : " + content.length +
            		", served pages : " + httpServer.servedPages);

    		var file = utils.getTemporaryFile(request.url);
    		fs.write(file, content, 'w');

            responsed = true;
            response.close();

            // TODO : check file system for a "stop" request

            if (httpServer.servedPages >= httpServer.config.maxServedPage) {
            	// it seems phantomjs can not recycle resource correctly
            	// give the process a chance to recycle resources
            	// the process will be restarted by coordinator
            	quit = true;

            	// mongoose seems do not catch signals, which causes crash if exit the process before stop the server
            	httpServer.stop();

            	system.stderr.write('terminate');
            }
        });
    },
};

httpServer.run();
