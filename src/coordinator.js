var process = require("child_process");
var fs = require("fs");
var page = require('webpage').create();
var utils = require('./utils');

var UrlFile = "urls.txt";
var ServerPort = 19080;
var ControlCenter = "http://qiwur.com/satellite/controller";
var PHANTOMJS = "phantomjs";

var coordinator = {

    argumentConfig : [
         {
              name: 'fetch-times',
              def: 10000000,
              req: false,
              desc: 'the controller center url'
         },
         {
             name: 'local-urls',
             def: true,
             req: false,
             desc: 'the controller center url'        	 
         },
         {
             name: 'controller',
             def: ControlCenter,
             req: false,
             desc: 'the controller center url'
         }
    ],

    config: {},
    
	updateFinished: false,

    updateFetchList: function() {
    	coordinator.updateFinished = false;

    	if (coordinator.config['local-urls']) {
        	coordinator.updateFinished = true;
    		return;
    	}

    	page.open(coordinator.config['controller'] + "/" + "fetchList", function (status) {
        	if (status !== 'success') {
                console.log('FAIL to load the fetch list');
                phantom.exit(1);
            } else {
            	fs.remove(UrlFile);
            	fs.write(UrlFile, page.content);
            	coordinator.updateFinished = true;
            }
        });
    	coordinator.updateFinished = true;
    },

    removeSpiderLockFiles: function() {

        // 删除所有spider的文件锁
        files = fs.list(utils.getSpiderLockDir());
        for (var i = 0; i < files.length; ++i) {
        	var file = files[i];

        	if (file === "." || file === "..") continue;

        	file = utils.getSpiderLockDir() + fs.separator + file;

    		console.log("remove file : " + file);

        	if (fs.isFile(file)) {
        		fs.remove(file);
        	}
        }
    },

    run: function () {
        if (!utils.processArgs(coordinator.config, coordinator.argumentConfig)) {
            phantom.exit();
            return;
        }

//        console.log(coordinator.config["local-urls"]);
//        
//    	Object.keys(coordinator.config).forEach(function(key) {
//    		console.log(key + " : " + coordinator.config[key]);
//    	});
//        return;

    	// 启动网页服务器
    	process.execFile(PHANTOMJS, ["server.js", ServerPort], null, function(err, stdout, stderr) {
			  console.error(stderr);
		});

    	// 测试网页服务器
    	page.open("http://localhost:" + ServerPort + "/" + utils.getSafeCommand("hello"), function(status) {
    		console.log(page.content);

    		if (page.content != "hello") {
    			// console.error("bad response");
    		}

    		page.close();
    	});

        // 删除所有spider的文件锁
    	coordinator.removeSpiderLockFiles();

    	// 启动爬虫
    	// 系统中只允许有一个爬虫，只有当其他爬虫都完成工作的时候，才会启动新爬虫爬取新的链接集合
		// 每10s检查一次是否需要重新获取链接集合
        interval = setInterval(function() {
    		if (coordinator.config['fetch-times'] <= 0) {
    			clearInterval(interval);
    			return;
    		}

			var runningSpider = utils.getRunningSpiderNumber();

    		console.log("running spider : " + runningSpider);

			if (runningSpider == 0) {
				if (!coordinator.updateFinished) {
					coordinator.updateFetchList();
				}
				else {
		    		console.log("start the spider");

					// 启动爬虫
		    		process.execFile(PHANTOMJS, ["spider.js", UrlFile], null, function(err, stdout, stderr) {
		    			  console.log(stdout);
		    			  console.log(stderr);
		    		});

		    		--coordinator.config['fetch-times'];
				}
			}

        }, 1000 * 10);

        // 等待退出
        coordinator.waitForExit();
    }, // run

    waitForExit: function() {
    	// 每5秒钟检查一次是否需要退出程序
        var exit = false;
        setInterval(function() {
        	if (exit && coordinator.config['fetch-times'] <= 0) {
        		console.log("mission complete! bye!");
        		// 删除文件锁
        		fs.remove(utils.getSpiderLockFile());
        		phantom.exit(0);
        	}

        	// 可能要退出，先置标志位，5s后重新检查，5s后如果确认退出，则退出程序
        	if (coordinator.config['fetch-times'] <= 0) {
        		exit = true;
        	}
        	else {
        		exit = false;
        	}
        }, 5000);
    }
};

coordinator.run();
