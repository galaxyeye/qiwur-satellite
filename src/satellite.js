var system = require("system");
var fs = require("fs");
var utils = require('./utils');
var md5 = require("./md5");
var logger = require('./logger');
var config = require('./config').loadConfig().fetchController;
var scheduleUrl = config.scheduleUrl + "/" + config.scheduleCount;

var ForwardHeaders = ['Server', 'Content-Type', 'Content-Language', 'X-Powered-By',
                      'Location',
                      'Set-Cookie', 'Vary', 'Date',
                      'X-Cache', 'X-Cache-Lookup',
                      'Cache-Control', 'Last-Modified', 'Expires'];

var SUBMIT_CONTENT_SEPERATOR = "\r\n\r\n";

var ExitWait = 20;

var MaxServedPage = 100;

var quit = false;

var satellite = {

    status : "ready",

    round : 0,

    roundInterval : null,

    roundTick : 0,

    exitTick : 0,

    schedulePeriod : 1, // in seconds

    servedPages : 0,

    /**
     * Start the satellite client system
     * */
    run : function() {
        // tick every second
        this.roundInterval = setInterval(function() {
            ++satellite.roundTick;

            // exit the satellite fetcher system
            if (quit) {
                if (++satellite.exitTick > ExitWait) {
                    phantom.exit(0);
                }
                else if (satellite.exitTick % 5) {
                    console.log("waiting for exit...");
                }
            }

            // start the fetch cycle
            var schedule = (satellite.roundTick % satellite.schedulePeriod == 0);
            if (!quit && satellite.status == "ready" && schedule) {
                ++satellite.round;

                satellite.schedule(scheduleUrl);
            }
        }, 1000);
    },

    /**
     * ask for tasks and fetch the target web page
     * */
    schedule : function (scheduleUrl) {
        var page = require('webpage').create();

        page.open(scheduleUrl, function (status) {
            if (status !== 'success') {
                console.log("round " + satellite.round + ", no tasks");

                satellite.__adjustSchedulePeriod(true);

                page.close();
                satellite.status = "ready";
                return;
            }

            satellite.status = "scheduled";

            console.log("round " + satellite.round + ", tasks : " + page.plainText);

            var fetchItems = JSON.parse(page.plainText);

            // release resource
            page.close();

            var adjust = (fetchItems.length != 0);
            satellite.__adjustSchedulePeriod(adjust);

            // and then we fetch the desired web page
            // TODO : fix multiple items problem
            for (var i = 0; i < fetchItems.length; ++i) {
                satellite.fetch(fetchItems[i]);
            }
        });
    },

    /**
     * Download the target web page, ask for all ajax content if necessary
     * 
     * TODO : 
     * 1. We may need to ask tasks from and commit the job back to the slave nutch slaves
     * 2. Sniff nested page lists, for example, comments for a product
     * comments for a specified product might be very large and can be separated into pages
     * */
    fetch : function(fetchItem) {
        console.log("fetch item id : " + fetchItem.itemID);

        this.status = "fetching";

        require('./fetcher').create().fetch(fetchItem.url, config, function(response, page) {
            if (!page) {
                logger.error("page is closed, skip...");

                satellite.status = "ready";

                return;
            }

            satellite.status = "fetched";

            // build headers to forward to the server
            var headers = [];
            for (var i = 0; i < response.headers.length; ++i) {
                var name = response.headers[i].name;
                var value = response.headers[i].value;

                if (ForwardHeaders.indexOf(name) !== -1) {
                    // nutch seeks a "\n\t" or "\n " as a line continue mark
                    // but it seems that some response header use only '\n' for a line continue mark
                    value = value.replace(/\n\t*/g, "\n\t");
                    if (name == 'Content-Type') {
                        // the content encoding is utf-8 now for all pages
                        value = value.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');
                    }

                    headers.push([name, value]);
                }
            }

            var username = config.username;
            var password = config.password;
            password = md5.hex_md5(password); // TODO : add a piece of salt
            // TODO : compress content
            var content = page.content.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

            var fetchStatus = {
                'version' : 0.80,
                'username' : username,
                'password' : password,
                'queueID' : fetchItem.queueID,
                'itemID' : fetchItem.itemID,
                'statusCode' : response.status,
                'headers' : headers,
                'checksum' : md5.hex_md5(content),
                'url' : fetchItem.url,
            };

            satellite.submit(fetchStatus, content);
        });
    },

    /**
     * Upload the fetch result to the fetch server
     * */
    submit: function (fetchStatus, content) {
        var page = require('webpage').create();
        page.onError = function (msg, trace) {
            console.log(msg);
            trace.forEach(function(item) {
                console.log('  ', item.file, ':', item.line);
            });
        };
        var data = JSON.stringify(fetchStatus) + SUBMIT_CONTENT_SEPERATOR + content;
        var settings = {
            operation : "PUT",
            encoding : "utf-8",
            headers : {
                "Content-Type" : "text/plain"
            },
            data : data
        };
        page.open(config.submitUrl, settings, function (status) {
            if (status !== 'success') {
                logger.error('FAIL to submit the task');
            }
            else {
                console.log('submit success\r\n');
            }

            satellite.status = "ready";

            // for debug
            var file = utils.getTemporaryFile(fetchStatus.url);
            fs.write(file, data, 'w');

            // stop satellite periodically to ensure all resource released correctly
            // the coordinator will restart the satellite
            if (++satellite.servedPages >= MaxServedPage) {
                satellite.stop();

                // communication with the coordinator
                system.stderr.write('terminate');
            }

            page.close();
        });
    },

    /**
     * Stop this satellite client process
     * */
    stop : function() {
        // it seems phantomjs can not recycle resource correctly
        // give the process a chance to recycle resources
        // the process will be restarted by coordinator
        quit = true;

        clearInterval(this.roundInterval);
    },

    /**
     * If no tasks, wait for a longer period, but no longer than 30 seconds
     * */
    __adjustSchedulePeriod : function(adjust) {
        if (adjust) {
            this.schedulePeriod *= 2;
            if (this.schedulePeriod > 30) {
                this.schedulePeriod = 30;
            }
        }
        else {
            this.schedulePeriod = 1;
        }
    }
};

satellite.run();
