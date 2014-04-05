var process = require("child_process");
var fs = require("fs");
var utils = require('./utils');

var UrlFile = "urls.txt";
var MaxProcessNumber = 10;

var spider = {
    urls: [],

    waitForExit: function() {
    	// 每两秒钟检查一次是否需要退出程序
        var exit = false;
        setInterval(function() {
        	if (exit && spider.urls.length == 0 && utils.getRunningWorkerProcessNumber() == 0) {
        		console.log("mission complete!bye!");
        		phantom.exit(0);
        	}

        	// 可能要退出，先置标志位，2s后重新检查，2s后如果确认退出，则退出程序
        	if (spider.urls.length == 0 && utils.getRunningWorkerProcessNumber() == 0) {
        		exit = true;
        	}
        	else {
        		exit = false;
        	}
        }, 2000);
    },

    run: function () {
        stream = fs.open(UrlFile, "r");
        while(url = stream.readLine()) {
        	if (url.indexOf("http") === 0) {
        		spider.urls.push(url);
        	}
        }

        files = fs.list(utils.getLockDir());
        for (var file in files) {
        	if (fs.isFile(file)) fs.remove(file);
        }

		console.log("span " + MaxProcessNumber + " child processes to fetch " + spider.urls.length + " urls");
		var counter = 0;
		// 每1/4秒检查一次是否需要处理新的任务。每个任务一个进程。
        interval = setInterval(function() {
    		if (spider.urls.length == 0) {
    			clearInterval(interval);
    			return;
    		}

        	++counter;

			var runningWorker = utils.getRunningWorkerProcessNumber();

    		console.log("tick : " + counter + " running worker : " + runningWorker + " process limit : " + MaxProcessNumber);
			if (spider.urls.length > 0 && runningWorker < MaxProcessNumber) {
				var url = spider.urls.pop();
	    		console.log("fetch : " + url);

	    		process.execFile("phantomjs", ["fetcher.js", url], null, function(err, stdout, stderr) {
	    			  console.log(stdout);
	    			  console.log(stderr);
	    		});
			}
        }, 250);

        spider.waitForExit();
    } // run
};

spider.run();
