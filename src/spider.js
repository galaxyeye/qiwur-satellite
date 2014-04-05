var process = require("child_process");
var fs = require("fs");
var system = require("system");
var utils = require('./utils');

var UrlFile = "urls.txt";
var MaxFetcherNumber = 10;
var PHANTOMJS = "phantomjs";

var spider = {
    urls: [],

    waitForExit: function() {
    	// 每5秒钟检查一次是否需要退出程序
        var exit = false;
        setInterval(function() {
        	if (exit && spider.urls.length == 0 && utils.getRunnigFetcherNumber() == 0) {
        		console.log("mission complete! bye!");
        		// 删除文件锁
        		fs.remove(utils.getSpiderLockFile());
        		phantom.exit(0);
        	}

        	// 可能要退出，先置标志位，5s后重新检查，5s后如果确认退出，则退出程序
        	if (spider.urls.length == 0 && utils.getRunnigFetcherNumber() == 0) {
        		exit = true;
        	}
        	else {
        		exit = false;
        	}
        }, 5000);
    },

    removeFetcherLockFiles: function() {
        // 删除所有fetcher的文件锁
        files = fs.list(utils.getFetcherLockDir());
        for (var i = 0; i < files.length; ++i) {
        	file = files[i];

        	if (file === "." || file === "..") continue;
        	
        	file = utils.getFetcherLockDir() + fs.separator + file;

    		console.log("remove file : " + file);
    		
        	if (fs.isFile(file)) {
        		fs.remove(file);
        	}
        }
    },
    
    run: function () {
    	// 系统中只能有一个爬虫，每个爬虫可以产生多个fetcher进程
    	// NOTICE ： 不能严格满足只有一个爬虫，如果在不同的目录下运行spider，可以产生多个爬虫
		var runningSpider = utils.getRunningSpiderNumber();
		if (runningSpider > 0) {
    		console.log("spider is already running!");
    		phantom.exit(0);
		}

		// 产生进程文件锁，注意这不是一个严格的文件锁，因为phontomjs api有限，只能用一个文件凑合用了
    	fs.touch(utils.getSpiderLockFile());

    	// 使用传入的链接文件，默认使用当前目录下的url.txt
		if (system.args.length === 2) {
			UrlFile = system.args[1];
		}

		// 读入链接
        var stream = fs.open(UrlFile, "r");
        while(url = stream.readLine()) {
        	if (url.indexOf("http") === 0) {
        		spider.urls.push(url);
        	}
        }

        // 删除所有fetcher的文件锁
        spider.removeFetcherLockFiles();

		console.log("span " + MaxFetcherNumber + " child processes to fetch " + spider.urls.length + " urls");

		// 每0.5秒检查一次是否需要处理新的任务。每个任务一个进程。
		var counter = 0;
        interval = setInterval(function() {
    		if (spider.urls.length == 0) {
    			clearInterval(interval);
    			return;
    		}

        	++counter;

			var runningFetcher = utils.getRunnigFetcherNumber();

			if (counter % 10 == 0) {
				console.log("tick : " + counter + " running fetcher : " + runningFetcher + " fetcher limit : " + MaxFetcherNumber);
			}

			if (spider.urls.length > 0 && runningFetcher < MaxFetcherNumber) {
				var url = spider.urls.pop();
	    		console.log("fetch : " + url);

	    		process.execFile(PHANTOMJS, ["--load-images=false", "fetcher.js", url], null, function(err, stdout, stderr) {
	    			  console.log(stdout);
	    			  console.log(stderr);
	    		});
			}
        }, 500);

        // 等待退出
        spider.waitForExit();
    } // run
};

spider.run();
