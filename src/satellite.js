var system = require("system");
var fs = require("fs");

require(fs.absolute("bootstrap"));

var sateutils = vendor('utils');
var md5 = vendor("md5");
var logger = vendor('logger');
var config = window.config.loadConfig().fetchController;

var loginUrl = config.nutchServer + "/service/login";
var fetcherUpdateUrl = config.nutchServer + "/service?type=FetcherServer";

var ForwardHeaders = ['Server', 'Content-Type', 'Content-Language', 'X-Powered-By',
                      'Location',
                      'Set-Cookie', 'Vary', 'Date',
                      'X-Cache', 'X-Cache-Lookup',
                      'Cache-Control', 'Last-Modified', 'Expires'];

var ExitWait = 20;

/**
 * The process exit when served page number exceed this number
 * */
var MaxServedPage = 200;

/**
 * The max wait time to ask for tasks
 * */
var MaxSchedulePeriod = 60;

/**
 * The max wait time to ask for tasks
 * */
var MaxupdateFetcherServerPoolPeriod = 60;

var quit = false;

var authorized = false;

var browserInstance = {
    id : null,
    username : config.username,
    password : config.password
};

var satellite = {

    fetcherServerPool : [],

    status : "ready",

    round : 0,

    roundInterval : null,

    roundTick : 0,

    exitTick : 0,

    schedulePeriod : 1, // in seconds

    updateFetcherServerPoolPeriod : 5, // in seconds

    servedPages : 0,

    /**
     * Start the satellite client system
     * */
    run : function() {
        satellite.login();

        // tick every second
        this.roundInterval = setInterval(function() {
            ++satellite.roundTick;

            if (!authorized) {
            	logger.info("not authorized");
            	// check for one minute
                if (satellite.roundTick < 60) {
                  return;
                }
                else {
                  // timed out, quit
                  quit = true;
                }
            }

            // exit the satellite fetcher system
            if (quit) {
                if (++satellite.exitTick > ExitWait) {
                    phantom.exit(0);
                }
                else if (satellite.exitTick % 5) {
                    logger.info("waiting for exit...");
                }
            }

            // update fetch server pool
            var shouldUpdate = (satellite.roundTick % satellite.updateFetcherServerPoolPeriod == 0);
            if (!quit && shouldUpdate) {
              satellite.updateFetcherServerPool(fetcherUpdateUrl);
            }

            // start the fetch cycle
            var serverCount = satellite.fetcherServerPool.length;
            var schedule = (satellite.roundTick % satellite.schedulePeriod == 0);
            schedule = schedule && (serverCount > 0);

//            logger.debug('quit : ' + quit
//                    + ', status : ' + satellite.status
//                    + ', schedule : ' + schedule
//                    + ', serverCount : ' + serverCount
//                    + ', updateFetcherServerPoolPeriod : ' + satellite.updateFetcherServerPoolPeriod
//                    + ', schedulePeriod : ' + satellite.schedulePeriod);

            if (!quit && satellite.status == "ready" && schedule) {
                ++satellite.round;

                var randomIndex = Math.floor(Math.random() * serverCount);
                var fetcherServer = satellite.fetcherServerPool[randomIndex];

                if (fetcherServer != undefined) {
                  satellite.schedule(fetcherServer);
                }
            }
        }, 1000);
    },

    login : function(loginUrl) {
    	authorized = true;
    	return true;

        var page = require('webpage').create();

        var settings = {
            operation : "PUT",
            encoding : "utf8",
            headers : {
                "Content-Type" : "text/html; charset=utf-8"
            },
            data : browserInstance
        };
        page.onResourceRequested = function(requestData, networkRequest) {
        // logger.debug(JSON.stringify(requestData));
        };

        page.open(loginUrl, settings, function (status) {
            if (status !== 'success') {
                logger.warn("failed to login");

                page.close();

                authorized = false;

                return;
            }

            logger.debug(page.plainText);

            // TODO : is it safe? I wonder if the callback is running in another thread
            browserInstance = JSON.parse(page.plainText);

            authorized = true;

            page.close();
        });
    },

    updateFetcherServerPool : function (updateUrl) {
        var page = require('webpage').create();

        logger.info(updateUrl);

        page.open(updateUrl, function (status) {
            if (status !== 'success') {
                logger.warn("failed to update fetcher server list, status : " + status);

                // The nutch server seems NOT OK, slow down updating
                satellite.__adjustUpdateFetcherServerPoolPeriod(true);

                page.close();

                return;
            }

            logger.debug(page.plainText);

            // TODO : is it safe? I wonder if the callback is running in another thread
            satellite.fetcherServerPool = JSON.parse(page.plainText);

            page.close();
        });
    },

    /**
     * ask for tasks and fetch the target web page
     * */
    schedule : function (fetcherServer) {
        var page = require('webpage').create();

        var scheduleUrl = sateutils.getUrl(fetcherServer.ip, fetcherServer.port, "/fetch/schedule/1");

        logger.debug("scheduleUrl : " + scheduleUrl);

        page.open(scheduleUrl, function (status) {
            if (status !== 'success') {
                logger.info("failed to ask tasks");

                // The fetch server seems NOT OK, speed up updating
                satellite.__adjustUpdateFetcherServerPoolPeriod(false);
                // And slow down scheduling
                satellite.__adjustSchedulePeriod(true);

                page.close();
                satellite.status = "ready";
                return;
            }

            satellite.status = "scheduled";

            logger.debug(page.plainText);

            var fetchItems = JSON.parse(page.plainText);

            // release resource
            page.close();

            // The fetch server seems be OK, slow down updating
            satellite.__adjustUpdateFetcherServerPoolPeriod(true);

            if (fetchItems.length == 0) {
                satellite.__adjustSchedulePeriod(true);
                satellite.status = "ready";
            }
            else {
                satellite.__adjustSchedulePeriod(false);

                logger.debug("round : " + satellite.round + ", task id : " + fetchItems[0].itemID
                        + ", " + fetchItems[0].url);

                // fetch the desired web page
                satellite.fetch(fetcherServer, fetchItems[0]);
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
    fetch : function(fetcherServer, fetchItem) {
        // logger.debug("fetch item id : " + fetchItem.itemID + ", url : " + fetchItem.url);

        var start = new Date().getTime();
        this.status = "fetching";

        var fetcher = require('./fetcher').create();
        fetcher.fetch(fetchItem.url, config, function(response, page) {
            if (!page) {
                logger.error("page is closed, skip...");

                satellite.status = "ready";

                return;
            }

            if (page.content.length < 200) {
                logger.debug('page content is too small, length : ' + page.content.length);
            }

            satellite.status = "fetched";

            var elapsed = new Date().getTime() - start; // in milliseconds

            // satellite information
            var username = config.username;
            var password = config.password;
            password = md5.hex_md5(password); // TODO : add a piece of salt
            // TODO : compress content and optimization
            var content = page.content.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

            var customHeaders = {
                'Q-Version' : 0.80,
                'Q-Username' : username,
                'Q-Password' : password,
                'Q-Job-Id' : fetchItem.jobID,
                'Q-Queue-Id' : fetchItem.queueID,
                'Q-Item-Id' : fetchItem.itemID,
                'Q-Status-Code' : response.status,
                'Q-Checksum' : md5.hex_md5(content),
                'Q-Url' : fetchItem.url,
                'Q-Response-Time' : elapsed
            };

            // forwarded information
            // for every forwarded header, add a F- prefix
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

                    customHeaders["F-" + name] = value;
                }
            }

            if (page) {
                page.close();
                page = null;
            }

            satellite.submit(fetcherServer, customHeaders, content);
        });
    },

    /**
     * Upload the fetch result to the fetch server
     * */
    submit: function (fetcherServer, customHeaders, content) {
        var page = require('webpage').create();
        page.customHeaders = customHeaders;
        var settings = {
            operation : "PUT",
            encoding : "utf8",
            headers : {
                "Content-Type" : "text/html; charset=utf-8"
            },
            data : content
        };
        page.onResourceRequested = function(requestData, networkRequest) {
            // logger.debug(JSON.stringify(requestData));
        };

        var submitUrl = sateutils.getUrl(fetcherServer.ip, fetcherServer.port, "/fetch/submit");
        page.open(submitUrl, settings, function (status) {
            if (status !== 'success') {
                logger.error('FAIL to submit, status : ' + status + ', result : ' + page.content);
            }
            else {
                logger.debug('submitted ' + customHeaders['Q-Url']);
            }

            // for debug
            if (config.savePage) {
                // TODO : remove old files

                var file = sateutils.getTemporaryFile(customHeaders['Q-Url']);
                fs.write(file, page.content, 'w');
            }

            satellite.status = "ready";

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
    __adjustSchedulePeriod : function(slowDown) {
        if (slowDown) {
            this.schedulePeriod *= 2;
            if (this.schedulePeriod > MaxSchedulePeriod) {
                this.schedulePeriod = MaxSchedulePeriod;
            }
        }
        else {
            this.schedulePeriod = 1;
        }
    },

    /**
     * If no tasks, wait for a longer period, but no longer than 30 seconds
     * */
    __adjustUpdateFetcherServerPoolPeriod : function(slowDown) {
        if (slowDown) {
            this.updateFetcherServerPoolPeriod *= 2;
            if (this.updateFetcherServerPoolPeriod > MaxupdateFetcherServerPoolPeriod) {
                this.updateFetcherServerPoolPeriod = MaxupdateFetcherServerPoolPeriod;
            }
        }
        else {
            this.updateFetcherServerPoolPeriod = 5;
        }
    }
};

satellite.run();
