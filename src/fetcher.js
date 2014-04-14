var fs = require("fs");
var system = require("system");
var md5 = require("./md5");
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
    "consolePrefix": "#",
    "viewportWidth": 1920,
    "viewportHeight": 1080
};

var tools = {

    saveAndExit: function(url, html) {
        logger.debug("save file");

        utils.saveHtml(url, html);

        fs.remove(utils.getFetcherLockFile());

        phantom.exit();
    },

    simulateHumanBehavior: function(page) {
        page.evaluate(function() {
            var links = document.getElementsByTag("a");
            for (var link in links) {
                // create hover event, etc
            }
            // window.document.body.scrollTop = document.body.scrollHeight / 1.1;
        });
    }

};

function Fetcher() {
	this.config = DefaultConfig;
	this.page = null;
	this.pageLoaded = false;
	this.pageClosed = false;
	this.scrollCount = 0;
	this.scrollInterval = null;
	this.lastScrollTime = new Date().getTime();
	this.ajaxRequests = 0;
	this.ajaxResponses = 0;
	this.mainResponse = null;
};

Fetcher.prototype.fetch = function(url, config, onContentComplete) {
    if (config) {
        this.config = utils.mergeConfig(this.config, config);
    }
    this.config.url = url;

    if (onContentComplete) {
    	fetcher = this;

        this.onContentComplete = function(response, page) {
            logger.debug("call user defined complete handler");

            if (!fetcher.pageClosed) {
                onContentComplete(response, page);
            	page.close();
            }
            else {
                logger.error("page is closed");
                onContentComplete(response, null);
            }

            fetcher.pageClosed = true;
        };
    }

    // 加载网页
    this.load();
};

Fetcher.prototype.load = function () {
    var page = this.page = new WebPage();
    var config = this.config;

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

    var fetcher = this;
    events.forEach(function (event) {
        if (fetcher[event]) {
            page[event] = function () {
                var args = [page, config];
                for (var a = 0; a < arguments.length; a++) {
                    args.push(arguments[a]);
                }

                // 在WebPage函数参数的基础上，增加了page和config两个输入参数
                fetcher[event].apply(fetcher, args);
            };
        }
    });

    logger.debug("fetch url : " + config.url);

    page.viewportSize = { width: config.viewportWidth, height: config.viewportHeight };
    logger.debug(JSON.stringify(page.viewportSize));

    // 所有的回调函数都已经注册完毕，启动网络请求
    page.open(config.url);
};

Fetcher.prototype.onError = function(msg, trace) {
    // logger.debug(JSON.stringify(msg));
};

Fetcher.prototype.onLoadStarted = function (page, config) {
};

Fetcher.prototype.onResourceRequested = function (page, config, requestData, request) {
    // logger.debug('Request (#' + requestData.id + ')');
    // logger.debug('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));

    if (this.pageLoaded) {
        ++this.ajaxRequests;
    }
};

Fetcher.prototype.onResourceReceived = function (page, config, response) {
    if (!this.mainResponse) {
        logger.debug("main response : " + JSON.stringify(response));
        this.mainResponse = response;
    }

    if (response.stage == 'end') {
         // logger.debug("#" + response.id + " loaded");
         // logger.debug("#" + response.id + " loaded \n" + JSON.stringify(response));
    }

    // 如果页面加载完毕，那么将会通过模拟用户行为的方法来请求新资源
    // 目前是向下滚动5次，每次滚动一个页面高度（接近）
    if (this.pageLoaded && response.stage == 'end') {
        ++this.ajaxResponses;
    }
};

Fetcher.prototype.onResourceTimeout = function(page, config, request) {
	logger.debug("#" + request.id + " timeout");
};

Fetcher.prototype.onLoadFinished = function (page, config, status) {
    if (status != 'success') {
        logger.debug('# FAILED TO LOAD');
        return;
    }

    if (this.pageClosed) {
    	this.onContentComplete(this.mainResponse, null);
    	return;
    }

    var fetcher = this;
    this.pageLoaded = true;

    // 每隔一段时间滚动一次
    var tick = config['scrollCount'];
    fetcher.scrollInterval = setInterval(function() {
        logger.debug("tick : " + tick + " scroll down : " + fetcher.scrollCount);
        --tick;

        page.evaluate(function() {
            document.body.setAttribute("source", document.URL);
            window.document.body.scrollTop = document.body.scrollHeight / 1.5;
        });

        fetcher.lastScrollTime = new Date().getTime();

        if (++fetcher.scrollCount >= config['scrollCount']) {
        	// TODO : is this scrollInterval really cleared?
        	if (fetcher.scrollInterval) {
                clearInterval(fetcher.scrollInterval);
                fetcher.scrollInterval = null;
        	}
        }
    }, 500);

    var checkTimes = 16; // 检查16次，间隔250ms，也就是4s
    utils.waitFor(function() {
//            logger.debug(" scroll count : " + this.scrollCount
//            + " ajax requests : " + this.ajaxRequests 
//            + " ajax respounses : " + this.ajaxResponses);

        // 情形1
        // 所有滚动事件都发出去了，所有的结果都收回来了，这种情形一般是一个滚动有一条响应
        if (fetcher.scrollCount >= config['scrollCount'] && fetcher.scrollCount >= fetcher.ajaxResponses) {
            return true;
        }

        // 情形2
        // 所有滚动事件都发出去了后，又过来一段时间，没有更多数据返回，那么认为不会再有事件了
        if (fetcher.scrollCount >= config['scrollCount']) {
            if (new Date().getTime() - fetcher.lastScrollTime >= config['scrollTimeout']) {
                return true;
            }
        }

        // 情形3
        // 发出了滚动事件，有结果没有收回，反复检查几次，认为滚动事件已经不能触发ajax请求了
        var hasTrivalScroll = fetcher.scrollCount > fetcher.ajaxRequests 
            || fetcher.scrollCount > fetcher.ajaxResponses;

        if (hasTrivalScroll) {
            logger.debug("waiting ..." + fetcher.pageLoaded + " " + checkTimes + " "
                    + fetcher.scrollCount + " " + fetcher.ajaxRequests + " " + fetcher.ajaxResponses);

            return --checkTimes <= 0;
        }

        return false;
    }, function() {
        // condition fulfilled
        logger.debug("condition fulfilled, page is valid : " + !fetcher.pageClosed);

        if (fetcher.scrollInterval) {
        	clearInterval(fetcher.scrollInterval);
            fetcher.scrollInterval = null;
        }

    	fetcher.onContentComplete(fetcher.mainResponse, page);
    }, function() {
        // 
        logger.debug("time out, page is valid : " + !fetcher.pageClosed);

        if (fetcher.scrollInterval) {
        	clearInterval(fetcher.scrollInterval);
            fetcher.scrollInterval = null;
        }

    	fetcher.onContentComplete(fetcher.mainResponse, page);
    },
    config.fetchTimeout);
};

Fetcher.prototype.onContentComplete = function(response, page) {
    logger.debug("content complete in fetcher");
    logger.debug(JSON.stringify(response));

    response.close();
};

exports.create = function() {
	return new Fetcher();
};
