/*global __utils__, CasperError, console, exports, phantom, patchRequire, require:true*/

"use strict";

var system = require("system");
var fs = require("fs");
var utils = require('utils');
var md5 = vendor("md5");
var logger = vendor('logger');
var configure = vendor('configure').create();

// register customer events
include("src/samples/detail/proxy_collector_events.js");

// Modify the following for your own need
var name = "xicidaili";
var outFile = "output/proxy/" + name;
var seed = "http://www.xicidaili.com/nn/";
var nextPageSelector = ".next_page";
var page = 0;
var maxPage = 800;
var ipList = [];
var finished = false;
var lastUrl = seed;

var conf = configure.loadConfig().fetcher;

var casper = require('casper').create(
    {
        clientScripts : ['src/lib/client/dist/satellite.min.js'],
        pageSettings : {
            userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
        },
        viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
        logLevel : "debug",
        verbose : true
    });

var events = new EventRegister(casper);

casper.on('load.failed', function() {
    this.echo("load.failed");
    this.exit();
});

casper.start(seed).then(function() {
    this.scrollToBottom();
}).then(function() {
    this.scrollTo(0, 0);
}).then(function () {
    ipList = ipList.concat(collectIps.call(casper));
}).then(function () {
    clickOpenAndCollect.call(this);
});

/*******************************************************************************
 * start main logic
 ******************************************************************************/
function clickOpenAndCollect() {
    if (finished || page++ > maxPage) {
        return;
    }

    if (page % 10 == 0) {
        // we can crawl other web site now
        this.wait(20 * 1000);
    }

    fs.write(outFile + "." + page, ipList.join("\n"), 'w');

    lastUrl = this.getCurrentUrl();
    this.then(function() {
        this.scrollToBottom();
    });

    this.waitForSelector(nextPageSelector, function () {
        this.thenClick(nextPageSelector, function() {
            ipList = ipList.concat(collectIps.call(this));
        });
    }, function () {
        finished = true;
    });

    this.wait(1000);
    
    this.waitFor(function() {
        return lastUrl !== casper.getCurrentUrl();
    }, function () {
        clickOpenAndCollect.call(this);
    });
}

function collectIps() {
    var ipList = casper.evaluate(function() {
        var ipList = [];
        var ipTable = __utils__.findAll("#ip_list tr");
        for (var i = 0; i < ipTable.length; ++i) {
            var ipRow = ipTable[i];
            var ip = __qiwur_getMergedTextContent(ipRow);
            ipList.push(ip);
        }
        return ipList;
    });

    return ipList;
}

casper.run(function() {
    this.echo("Total " + ipList.length + " ips, saved in " + outFile);
    fs.write(outFile, ipList.join("\n"), 'w');
    this.exit(0);
});
