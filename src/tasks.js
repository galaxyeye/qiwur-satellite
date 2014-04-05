var fs = require("fs");
var utils = require('./utils');
var md5 = require("./md5");

var tools = {

	saveHtml: function(url, html) {
		var file = md5.hex_md5(url);
		fs.write(utils.docRoot() + fs.separator + new Date().getDate() + fs.separator + file, html, 'w');
	},

    saveFullPage: function (config, page, task) {
    	if (!page) {
    		console.log("page has been deleted");
    		return;
    	}

    	if (task.pageSaved) {
    		console.log("page has been already saved");

        	fs.remove(utils.getFetcherLockFile());
        	phantom.exit();

    		return;
    	}

        // 切换到主框架
        page.switchToFocusedFrame();
        // 每个页面在完成page load后继续等待20秒
        var tryCount = 20;
        // 对每个页面，向下滚动5次
    	var scrollCount = 5;

    	// 每0.5秒发送一个滚动事件，如果有三个滚动事件都没有响应，认为已经没有更多事件触发了，直接结束
    	interval = setInterval(function() {
    		if (task.pageSaved) {
    			clearInterval(interval);
            	fs.remove(utils.getFetcherLockFile());
    			phantom.exit();
    		}

    		console.log("try : " + tryCount + " scroll : " + scrollCount + " waiting res : " + task.waitingResources);

            if (tryCount-- > 0 && scrollCount-- > 0 && task.waitingResources < 3) {
        	    page.evaluate(function() {
        	    	window.document.body.scrollTop = document.body.scrollHeight / 1.1;
        	    });
        	    ++task.waitingResources;
            } else {
            	clearInterval(interval);

        		console.log("save page");

        		tools.saveHtml(page.url, page.content);

        		task.pageSaved = true;
            	fs.remove(utils.getFetcherLockFile());
            	phantom.exit();
            }
        }, 500);
    }
};

var load = function (config, task, scope) {
    var page = new WebPage();

    if (config.consolePrefix) {
        page.onConsoleMessage = function (msg, line, src) {
            console.log(config.consolePrefix + ' ' + msg + ' (' + src + ', #' + line + ')');
        };
    }

    if (config.userAgent && config.userAgent != "default") {
        if (config.userAgentAliases[config.userAgent]) {
            config.userAgent = config.userAgentAliases[config.userAgent];
        }
        page.settings.userAgent = config.userAgent;
    }

    ['onInitialized', 'onLoadStarted', 'onResourceRequested', 'onResourceReceived', 'onResourceTimeout']
    .forEach(function (event) {
        if (task[event]) {
            page[event] = function () {
                var args = [page, config], a, aL;

                for (a = 0, aL = arguments.length; a < aL; a++) {
                    args.push(arguments[a]);
                }

                task[event].apply(scope, args);
            };
        }
    });

    page.onResourceRequested = function(requestData, request) {
        if ((/http:\/\/.+?\.css/gi).test(requestData['url']) || requestData['Content-Type'] == 'text/css') {
            console.log('css resource, aborting: ' + requestData['url']);
            request.abort();
        }

        // console.log("#" + requestData.id + " : " + requestData.url);
    };

    if (task.onLoadFinished) {
        page.onLoadFinished = function (status) {
        	// 接到phantomjs的Load Finished消息后，等待DOM建立，完成后才触发用户自定义消息处理器
        	utils.waitFor(function() {
	            visible = page.evaluate(function() {
	                return document.getElementsByTagName("body");
	            });

	            return visible;
	        }, function() {
	            console.log("The body element should be visible now");
	            console.log("Page content length : " + page.content.length);

                task.onLoadFinished.call(scope, page, config, status);
	        });
        };
    }

    console.log("fetch url : " + config.url);
	page.open(config.url);
};

var tasks = {

    fetch : {
    	pageLoaded: false,
    	pageSaved: false,
        waitingResources : 0,

        onLoadStarted: function (page, config) {
            if (!this.fetch.start) {
                this.fetch.start = new Date().getTime();
            }
        },

        onResourceRequested: function (requestData, request) {
        	console.log("#" + request.id + " : " + request.url);
            if ((/http:\/\/.+?\.css/gi).test(requestData['url']) ) {
                console.log('The url of the request is matching. Aborting: ' + request.url);
                request.abort();
            }

            // console.log(JSON.stringify(request.headers));

        	if (this.fetch.pageLoaded) {
        		// console.log("#" + request.id + " is loading...");

                // this.fetch.waitingResources[request.id] = request;
        	}
        },

        onResourceReceived: function (page, config, response) {
        	if (this.fetch.pageLoaded && response.stage == 'end') {
        		console.log("#" + response.id + " loaded");

        		--this.fetch.waitingResources;
                // this.fetch.waitingResources[response.id] = null;
        	}
        },

        onResourceTimeout: function(request) {
    		console.log("#" + request.id + " timeout");

    		--this.fetch.waitingResources;
        	// this.fetch.waitingResources[request.id] = null;
        },

        onLoadFinished: function (page, config, status) {
            if (status != 'success') {
                console.log('# FAILED TO LOAD');
                return;
            }

            page.evaluate(function() {
            	document.body.setAttribute("source", document.URL);
            });

            this.fetch.pageLoaded = true;

            tools.saveFullPage(config, page, this.fetch);
        }
    }
};

exports.load = load;

for (var t in tasks) {
	exports[t] = tasks[t];
}
