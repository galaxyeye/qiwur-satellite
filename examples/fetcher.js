var utils = require('./utils');

(function(host) {

	var USER_AGENT = 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36';

	function Fether() {
	}

	Fether.webpage = require('webpage');

	Fether.isTargetResource = function(url) {
		return Fether.isIndexPage(url) || Fether.isDetailPage(url) || Fether.isJS(url);
	};

	Fether.isIndexPage = function(url) {
		return (/.+searchex\..+/gi).test(url);
	};

	Fether.isDetailPage = function(url) {
		return (/.+item\..+/gi).test(url);
	};

	Fether.isJS = function(url) {
	    if ((/http:\/\/.+?\.js/gi).test(url)) {
	    	return true;
	    }

		return false;
	};

	Fether.prototype.fetch = function(url, onSuccess, onFailure) {
		var page = Fether.webpage.create();
		page.settings.userAgent = USER_AGENT;
		page.pageDownCount = 0;
		page.countDown = 10;
		page.simulateKeyEvent = simulateKeyEvent;
		
		page.onLoadFinished = function(status) {
		};

		page.onCallback = function(data) {
		    // console.log('CALLBACK: ' + JSON.stringify(data));  // Prints 'CALLBACK: { "hello": "world" }'
		};

		page.onResourceRequested = function(requestData, request) {
		    if ((/http:\/\/.+?\.css/gi).test(requestData['url']) || requestData['Content-Type'] == 'text/css') {
		        console.log('Its a css. Aborting: ' + requestData['url']);
		        request.abort();
		    }

//		    if (!(/.+yixun.+/gi).test(requestData['url'])) {
//		        console.log('its a external resource. Aborting: ' + requestData['url']);
//		        request.abort();
//		    }
		};

		page.onResourceReceived = function(response) {
			if (response.stage == "end") {
			    console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
			}
		};

		page.onResourceTimeout = function(request) {
		    console.log('Response timeout (#' + request.id + '): ' + JSON.stringify(request));
		};

		page.open(url, function(status) {
			if ('fail' === status) {
				onFailure({url : url, status : status});
			} else {
		        waitFor(function() {
		            visible = page.evaluate(function() {
		                return document.getElementsByTagName("body");
		            });

		            return visible !== undefined;
		        }, function() {
		            console.log("The body element should be visible now.");

		            // 切换到主框架
		            page.switchToFocusedFrame();

		            // 每个页面在完成page load后继续等待20秒
		            var t = 20;
		            // 对每个页面，向下滚动10次，每次2/3个页面
                	var scrollCount = 10;

		            setInterval(function() {
		                if (t > 0) {
		                	if (scrollCount > 0) {
		                	    page.evaluate(function() {
		                	    	window.document.body.scrollTop = document.body.scrollHeight / 1.5;
		                	    });
		                	}

		                	scrollCount--;

		                    console.log(t--);
		                } else {
		                	// 最后将页面保存下来
		        			var fs = require('fs');
		        			// TODO : page name
		        			fs.write("output/" + 1 + ".html", page.content, 'w');

		                    console.log("BLAST OFF!");
		                    phantom.exit();
		                }
		            }, 1000);
		        });

				// onSuccess({url : url, status : status, content : page.content});
			}
		});
	};

	host.Fether = Fether;
})(phantom);

new phantom.Fether().fetch(
	"http://item.yixun.com/item-225085.html",
	function onSuccess(result) {
		console.log("Loaded result. URL = " + result.url + " content length = "
				+ result.content.length + " status = " + result.status);
	},

	function onFailure(result) {
		console.log("Could not load page. URL = " + result.url + " status = "
				+ result.status);
	}
);
