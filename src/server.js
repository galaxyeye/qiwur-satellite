var page = require('webpage').create();
var server = require('webserver').create();
var system = require('system');
var fs = require('fs');

var utils = require('./utils');
var fetcher = require('./fetcher');

var httpServer = {

    argumentConfig : [
         {
             name: 'port',
             def: '19080',
             req: false,
             desc: 'fetcher process time out limit'
         },
         {
             name: 'fetchTimeout',
             def: 1000 * 60 * 2,
             req: false,
             desc: 'fetcher process time out limit'
         },
         {
             name: 'scrollDown',
             def: 5,
             req: false,
             desc: 'scroll count after paged is loaded'
         },
    ],

    config: false,

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
		console.log("handle proxy request");

    	// TODO : ip black list check

    	// TODO : target block list check

    	// TODO : proxy loop check

    	// TODO : anthorization

    	// TODO : route : redirect or forward

    	this.forward(request, response);
	},

	run : function() {
    	this.config = utils.buildConfig(this.argumentConfig);

    	utils.emitConfig(this.config, " ");

    	var service = null;
    	var port = this.config.port;
    	var isProxy = port.indexOf('p') !== -1;

	    service = server.listen(port, { keepAlive: true }, function (request, response) {
	    	console.log(JSON.stringify(request));

	        if (isProxy) {
	        	httpServer.handleProxyRequest(request, response);
	        }
	        else {
	        	httpServer.handleHttpRequest(request, response);
	        }
	    });

	    if (service) {
	        console.log('Web server running on port ' + this.config.port);
	    } else {
	        console.error('Error: Could not create web server listening on port ' + this.config.port);
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
		console.log("forward to : " + request.url);

		fetcher.onContentComplete = function(proxyResponse, proxyContent) {
			response.statusCode = proxyResponse.statusCode;
			response.headers = proxyResponse.headers;
			response.headers['Connection'] = 'Keep-Alive';
			response.headers['Keep-Alive'] = 'timeout=5, max=100';
			response.headers['Content-Length'] = proxyContent.length;
			response.write(proxyContent);

			response.close();
		};

		fetcher.fetch(request.url);
	},
};

httpServer.run();
