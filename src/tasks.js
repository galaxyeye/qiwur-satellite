var fs = require("fs");
var utils = require('./utils');
var md5 = require("./md5");
var logger = require('./logger');

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

// 实现事件处理器
var tasks = {

    fetch : {
    	pageLoaded: false,
        scrollCount: 0,
        lastScrollTime : new Date().getTime(),
        ajaxRequests: 0,
        ajaxResponses: 0,
        mainResponse: null,
        onContentComplete: function(response, content) {
        	logger.debug("content complete in tasks.fetch");
        },

        onError: function(msg, trace) {
        	// logger.debug(JSON.stringify(msg));
        },

        onLoadStarted: function (page, config) {
        },

        onResourceRequested: function (page, config, requestData, request) {
        	// logger.debug('Request (#' + requestData.id + ')');
        	// logger.debug('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));

            if (this.fetch.pageLoaded) {
            	++this.fetch.ajaxRequests;
            }
        },

        onResourceReceived: function (page, config, response) {
    		if (!this.fetch.mainResponse) {
    			// logger.debug("main response : " + JSON.stringify(response));
    			this.fetch.mainResponse = response;
    		}

        	if (response.stage == 'end') {
        		// logger.debug("#" + response.id + " loaded");
        		// logger.debug("#" + response.id + " loaded \n" + JSON.stringify(response));
        	}

        	// 如果页面加载完毕，那么将会通过模拟用户行为的方法来请求新资源
        	// 目前是向下滚动5次，每次滚动一个页面高度（接近）
        	if (this.fetch.pageLoaded && response.stage == 'end') {
        		++this.fetch.ajaxResponses;
        	}
        },

        onResourceTimeout: function(page, config, request) {
    		logger.debug("#" + request.id + " timeout");
        },

        onLoadFinished: function (page, config, status) {
            if (status != 'success') {
                logger.debug('# FAILED TO LOAD');
                return;
            }

            var task = this.fetch;
            task.pageLoaded = true;

    	    var tick = config['scrollCount'];
    	    interval = setInterval(function() {
    	    	logger.debug("tick : " + tick + " scroll down : " + task.scrollCount);
    	    	--tick;

                page.evaluate(function() {
                	document.body.setAttribute("source", document.URL);
                	window.document.body.scrollTop = document.body.scrollHeight / 1.5;
                });

                task.lastScrollTime = new Date().getTime();

        	    if (++task.scrollCount >= config['scrollCount']) {
        	    	clearInterval(interval);
        	    	interval = null;
        	    }
    	    }, 1000);

    		var checkTimes = 16; // 检查16次，间隔250ms，也就是4s
    		var onContentComplete = task.onContentComplete;
    		var mainResponse = task.mainResponse;
        	utils.waitFor(function() {

        		tools.simulateHumanBehavior(page);

//    	    	logger.debug(" scroll count : " + task.scrollCount 
//    			+ "ajax requests : " + task.ajaxRequests 
//    			+ " ajax respounses : " + task.ajaxResponses);

        		// 情形1
        		// 所有滚动事件都发出去了，所有的结果都收回来了，这种情形一般是一个滚动有一条响应
        		if (task.scrollCount >= config['scrollCount'] && task.scrollCount >= task.ajaxResponses) {
        			return true;
        		}

        		// 情形2
        		// 所有滚动事件都发出去了后，又过来一段时间，没有更多数据返回，那么认为不会再有事件了
        		if (task.scrollCount >= config['scrollCount']) {
        			if (new Date().getTime() - task.lastScrollTime >= config['scrollTimeout']) {
        				return true;
        			}
        		}

        		// 情形3
        		// 发出了滚动事件，有结果没有收回，反复检查几次，认为滚动事件已经不能触发ajax请求了
        		var hasTrivalScroll = task.scrollCount > task.ajaxRequests 
        			|| task.scrollCount > task.ajaxResponses;

        		if (hasTrivalScroll) {
            		logger.debug("waiting ..." + task.pageLoaded + " " + checkTimes + " " 
            				+ task.scrollCount + " " + task.ajaxRequests + " " + task.ajaxResponses);

            		return --checkTimes <= 0;
        		}

        		return false;
	        }, function() {
	        	// condition fulfilled
	        	logger.debug("condition fulfilled");

	        	if (interval) clearInterval(interval);
	        	onContentComplete.call(task, mainResponse, page.content);
	        }, function() {
	        	// 
	        	logger.debug("time out");

	        	if (interval) clearInterval(interval);
	        	onContentComplete.call(task, mainResponse, page.content);
	        },
	        config.fetchTimeout);
        }
    }, // fetch

    // 其他task...
};

for (var t in tasks) {
	exports[t] = tasks[t];
}
