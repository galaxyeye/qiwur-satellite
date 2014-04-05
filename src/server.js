var page = require('webpage').create();
var server = require('webserver').create();
var system = require('system');
var fs = require('fs');

var utils = require('./utils');

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
};

var httpServer = {

	port : null,
	run : function() {
		if (system.args.length !== 2) {
		    console.log('Usage: server.js <some port>');
		    phantom.exit(1);
		}

	    this.port = system.args[1];

	    service = server.listen(this.port, { keepAlive: true }, function (request, response) {
	        console.log('Request at ' + new Date());
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
	    });

	    if (service) {
	        console.log('Web server running on port ' + this.port);
	    } else {
	        console.log('Error: Could not create web server listening on port ' + this.port);
	        phantom.exit();
	    }
	}
};

// console.log(services.list(utils.virtualPath2LocalPath("/")));
// console.log(services.get("/c412379c29ece11078e016fe4d42cb70"));
httpServer.run();
