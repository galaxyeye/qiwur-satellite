var fs = require("fs");
var system = require("system");
var tasks = require('./tasks');
var utils = require('./utils');

var DefaultConfig = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "fetchTimeout" : 2 * 60 * 1000,
    "scrollCount" : 5,
    "consolePrefix": "#"
};

var fetcher = {
    config: DefaultConfig,

    onContentComplete: function(response, content) {
    	console.log("content complete in fetcher");
    	console.log(JSON.stringify(response));

		response.close();
		fetcher.page.close();    	
    },

    page: null,

    fetch: function(url, config, onContentComplete) {
    	if (config) {
        	fetcher.config = utils.mergeConfig(fetcher.config, config);
    	}
    	fetcher.config.url = url;

    	if (onContentComplete) {
    		fetcher.onContentComplete = function(response, content) {
    			onContentComplete(response, content);

    			response.close();
    			fetcher.page.close();
    		};
    	}

    	// 加载网页
    	fetcher.load(tasks.fetch, tasks);
    },

    load: function (task, scope) {
        var page = fetcher.page = new WebPage();

        // set console prefix
        if (fetcher.config.consolePrefix) {
        	page.onConsoleMessage = function (msg, line, src) {
                console.log(fetcher.config.consolePrefix + ' ' + msg + ' (' + src + ', #' + line + ')');
            };
        }

        // set user agent
        if (fetcher.config.userAgentAliases[fetcher.config.userAgent]) {
            fetcher.config.userAgent = fetcher.config.userAgentAliases[fetcher.config.userAgent];
        }

        page.settings.userAgent = fetcher.config.userAgent;

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
                    var args = [page, fetcher.config];
                    for (var a = 0; a < arguments.length; a++) {
                        args.push(arguments[a]);
                    }

                	// 在WebPage函数参数的基础上，增加了page和config两个输入参数
                    task[event].apply(scope, args);
                };
            }
        });

        task.onContentComplete = function(response, content) {
        	// console.log("content complete in fetcher.load");
        	fetcher.onContentComplete.call(fetcher, response, content);
        };

        console.log("fetch url : " + fetcher.config.url);

        // 所有的回调函数都已经注册完毕，启动网络请求
        page.open(fetcher.config.url);
    },

};

exports.fetch = fetcher.fetch;
