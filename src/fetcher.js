var fs = require("fs");
var system = require("system");
var tasks = require('./tasks');
var utils = require('./utils');
var logger = require('./logger');

var DefaultConfig = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "fetchTimeout" : 1 * 60 * 1000,
    "scrollCount" : 10,
    "scrollTimeout" : 10 * 1000,
    "consolePrefix": "#"
};

var fetcher = {
    config: DefaultConfig,

    onContentComplete: function(response, content) {
    	logger.debug("content complete in fetcher");
    	logger.debug(JSON.stringify(response));

		response.close();
    },

    page: null,

    fetch: function(url, config, onContentComplete) {
    	if (config) {
    		this.config = utils.mergeConfig(this.config, config);
    	}
    	this.config.url = url;

    	if (onContentComplete) {
    		this.onContentComplete = function(response, content) {
    			logger.debug("call user defined complete handler");
    			onContentComplete(response, content);

    			// logger.debug("close response and page");

    			// response.close();
    			// page.close();
    		};
    	}

    	// 加载网页
    	this.load(tasks.fetch, tasks);
    },

    load: function (task, scope) {
        var page = this.page = new WebPage();
        var config = this.config;

        // set console prefix
        if (config.consolePrefix) {
        	page.onConsoleMessage = function (msg, line, src) {
                logger.debug(config.consolePrefix + ' ' + msg + ' (' + src + ', #' + line + ')');
            };
        }

        // set user agent
        if (config.userAgentAliases[config.userAgent]) {
        	config.userAgent = config.userAgentAliases[config.userAgent];
        }

        page.settings.userAgent = config.userAgent;

        // logger.debug(page.settings.userAgent);

        // 注册WebPage回调函数
        // @see https://github.com/ariya/phantomjs/wiki/API-Reference-WebPage#callbacks-list
        // 在tasks注册事件处理器，tasks中注册的事件处理器同原生的WebPage处理器函数原型多了两个参数：page和config
        var events = [
			'onError',
			'onInitialized',
			'onLoadStarted',
			'onLoadFinished',
			'onResourceRequested',
			'onResourceReceived',
			'onResourceTimeout'
        ];

        events.forEach(function (event) {
            if (task[event]) {
                page[event] = function () {
                    var args = [page, config];
                    for (var a = 0; a < arguments.length; a++) {
                        args.push(arguments[a]);
                    }

                	// 在WebPage函数参数的基础上，增加了page和config两个输入参数
                    task[event].apply(scope, args);
                };
            }
        });

        task.onContentComplete = this.onContentComplete;

        logger.debug("fetch url : " + config.url);

        page.viewportSize = { width: 1920, height: 1080 };
        logger.debug(JSON.stringify(page.viewportSize));

        // 所有的回调函数都已经注册完毕，启动网络请求
        page.open(config.url);
    },

};

for (var t in fetcher) {
	exports[t] = fetcher[t];
}
