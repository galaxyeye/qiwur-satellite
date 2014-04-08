var fs = require("fs");
var utils = require('./utils');
var md5 = require("./md5");

var tools = {

	saveAndExit: function(url, html) {
		console.log("save file");
		
		utils.saveHtml(url, html);

    	fs.remove(utils.getFetcherLockFile());

    	phantom.exit();
	}
};

// 实现事件处理器
var tasks = {

    fetch : {
    	pageLoaded: false,
        scrollCount: 0,
        ajaxRequests: 0,
        ajaxResponses: 0,
        mainResponse: null,
        onContentComplete: function(response, content) {
        	console.log("content complete in tasks.fetch");
        },

        onError: function(msg, trace) {
        	// console.log(JSON.stringify(msg));
        },

        onLoadStarted: function (page, config) {
        },

        onResourceRequested: function (page, config, requestData, request) {
        	// console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));

            if (this.fetch.pageLoaded) {
            	++this.fetch.ajaxRequests;
            }
            else if ((/http:\/\/.+?\.css/gi).test(requestData['url']) || requestData['Content-Type'] == 'text/css') {
                console.log('css resource, aborting: ' + requestData['url']);
                request.abort();
            }
        },

        onResourceReceived: function (page, config, response) {
    		if (!this.fetch.mainResponse) {
    			// console.log("main response : " + JSON.stringify(response));
    			this.fetch.mainResponse = response;
    		}

        	if (response.stage == 'end') {
        		// console.log("#" + response.id + " loaded \n" + JSON.stringify(response));
        	}

        	// 如果页面加载完毕，那么将会通过模拟用户行为的方法来请求新资源
        	// 目前是向下滚动5次，每次滚动一个页面高度（接近）
        	if (this.fetch.pageLoaded && response.stage == 'end') {
        		++this.fetch.ajaxResponses;

        		if (this.fetch.scrollCount <= config['scrollCount']) {
            		console.log("scroll down : " + this.fetch.scrollCount);

            		// 向下滚动屏幕
	        	    page.evaluate(function() {
	        	    	window.document.body.scrollTop = document.body.scrollHeight / 1.1;
	        	    });

	        	    ++this.fetch.scrollCount;
        		}
        	}
        },

        onResourceTimeout: function(page, config, request) {
    		console.log("#" + request.id + " timeout");
        },

        onLoadFinished: function (page, config, status) {
            if (status != 'success') {
                console.log('# FAILED TO LOAD');
                return;
            }

    	    this.fetch.pageLoaded = true;

            page.evaluate(function() {
            	document.body.setAttribute("source", document.URL);
            	window.document.body.scrollTop = document.body.scrollHeight / 1.1;
            });

    	    ++this.fetch.scrollCount;

    		// 滚动后，没有请求发出，认为滚动事件已经不能触发ajax请求了
    		var checkTimes = 8;
    		var onContentComplete = this.fetch.onContentComplete;
    		var mainResponse = tasks.fetch.mainResponse;
        	utils.waitFor(function() {
        		// 所有滚动事件都发出去了，所有的结果都收回来了
        		if (tasks.fetch.scrollCount >= config['scrollCount'] && tasks.fetch.scrollCount == tasks.fetch.ajaxResponses) {
        			return true;
        		}

        		// 发出了滚动事件，有结果没有收回
        		var hasTrivalScroll = tasks.fetch.scrollCount > tasks.fetch.ajaxRequests 
        			|| tasks.fetch.scrollCount > tasks.fetch.ajaxResponses;

        		if (hasTrivalScroll) {
            		console.log("waiting ..." + tasks.fetch.pageLoaded + " " + checkTimes + " " 
            				+ tasks.fetch.scrollCount + " " + tasks.fetch.ajaxRequests + " " + tasks.fetch.ajaxResponses);

            		return --checkTimes <= 0;
        		}

        		return false;
	        }, function() {
	        	// condition fulfilled
	        	console.log("condition fulfilled");

	        	onContentComplete.call(tasks.fetch, mainResponse, page.content);
	        }, function() {
	        	// time out
	        	console.log("time out");

	        	onContentComplete.call(tasks.fetch, mainResponse, page.content);
	        },
	        config.fetchTimeout);
        }
    }, // fetch

    // 其他task...
};

for (var t in tasks) {
	exports[t] = tasks[t];
}
