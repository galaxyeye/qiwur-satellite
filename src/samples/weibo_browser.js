"use strict";

var system = require("system");
var fs = require("fs");
var utils = require('utils');
var sutils = vendor('sutils');
var md5 = vendor("md5");
var logger = vendor('logger');
var configure = vendor('configure').create();

var weiboUrl = "http://weibo.com/kaifulee";
weiboUrl = "/home/vincent/workspace/qiwur-satellite/output/weibo/feeds-local.html";

var DefaultConf = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "logLevel" : 'debug'
};

var conf = configure.mergeConfig(DefaultConf, configure.loadConfig().fetcher);

var casper = require('casper').create(
    {
        clientScripts : [
            'src/lib/client/dist/satellite.min.js',
            'src/lib/client/thirdparty/jquery-1.11.2.js'
        ],
        pageSettings : {
            loadImages : true,
            loadPlugins : false,
            userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0",
            parameters: { 'proxy': 'socks://98.239.198.83:21320' }
        },
        viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
        logLevel : "debug",
        verbose : true
    });

// register customer events
include("src/samples/detail/weibo_login_events.js");
var events = new CasperEventRegister(casper);

/*******************************************************************************
 * Start main logic
 ******************************************************************************/
casper.start(weiboUrl).then(function() {
    this.scrollTo(0, 300);
}).then(function() {
    this.scrollTo(0, 0);
}).then(function() {
    this.waitForSelector(".WB_feed", function() {
        this.evaluate(function () {
            __utils__.echo("In Feed");

            var extractor = new WeiboExtractor();
            $('.WB_feed > .WB_cardwrap').each(function (i, node) {
                "use strict";

                var feed = extractor.extract(node);

                if (!feed.author && !feed.content) {
                    return;
                }

                __utils__.echo("");
                __utils__.echo(i);
                __utils__.echo(extractor.formatFeed(feed));
            });
        });
    }, function () {
        this.echo("Can not see .text element");
    });
});

casper.run(function() {
    this.exit(0);
});
