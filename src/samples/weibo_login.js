"use strict";

var system = require("system");
var fs = require("fs");
var utils = require('utils');
var sutils = vendor('sutils');
var md5 = vendor("md5");
var logger = vendor('logger');
var configure = vendor('configure').create();

// register customer events
include("src/samples/detail/weibo_login_events.js");

// Modify the following for your own need
var weiboUrl = "http://weibo.com/";

var usernameInput = '.B_login input[name="username"]';
var passwordInput = '.B_login input[name="password"]';
var verifyCodeInput = '.B_login input[name="verifycode"]';
var submitInput = '.B_login .item_btn a';

// var username = "scrabbler";
// var password = "Mosedoulan2";
var username = "chenzhanjiao8z@163.com";
var password = "hlpsvy081040y";

var homePagePattern = /home/;

var DefaultConf = {
    "userAgent": "chrome",
    "userAgentAliases": {
        "chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
    },
    "fetchTimeout" : 30 * 1000,
    "maxAjaxResponses" : 30,
    "consolePrefix": "#",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "logLevel" : 'debug',

    "scentServer" : "http://localhost:8181",
    "extractSerivce" : "http://localhost:8181/scent/extract",
    "extractJustInTime" : false
};

var conf = configure.mergeConfig(DefaultConf, configure.loadConfig().fetcher);

var status = 'OK';

var casper = require('casper').create(
    {
        clientScripts : ['src/lib/client/dist/satellite.min.js'],
        pageSettings : {
            loadImages : true,
            loadPlugins : false,
            userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
        },
        viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
        logLevel : "debug",
        verbose : true,
        stepTimeout : 5000,
        timeout : 5000,
        onTimeout : function(timeout) {
            status = 'timeout';
            this.echo("timeout " + timeout);
        },
        onStepTimeout : function(timeout, stepNum) {
            this.echo("timeout " + timeout + ", stepNum " + stepNum);
        },
        onWaitTimeout : function(timeout) {
            this.echo("wait timeout " + timeout);
        }
    });

var events = new CasperEventRegister(casper);

casper.on('load.failed', function() {
    this.echo("load.failed");
    this.exit();
});

/*******************************************************************************
 * start main logic
 ******************************************************************************/
casper.start(weiboUrl).then(function() {
    this.scrollToBottom();
}).then(function() {
    this.scrollTo(0, 0);
}).wait(5000).then(function() {
    this.echo("--------------");

    this.waitForSelector(".text", function() {
        this.echo(this.fetchText('.text'));
    }, function () {
        this.echo("Can not see .text element");
    });
    this.echo("--------------");
}).then(function () {
    var loginAreaSelector = ".gn_login";

    this.waitForSelector(loginAreaSelector, function() {
        // this.clickLabel("div.gn_login > ul > li:last-child > a");
        this.clickLabel("登录", "a");
    }, function onTimeout() {
        this.echo("Can not see login form");
    }).waitForPopup("/login/", function () {
        this.echo("Current url : " + this.getCurrentUrl());
    }).waitForSelector(passwordInput, function () {
        var waitForVerifyCode = false;
        var captureDir = "/tmp/warps/satellite/capture";
        var verifyCode = "";

        if (utils.exists(verifyCodeInput)) {
            waitForVerifyCode = true;
            this.captureSelector(captureDir + "/1.png", loginAreaSelector);
            this.echo("Capture saved in " + captureDir + "/1.png");
        }

        while(waitForVerifyCode) {
            this.wait(3, function () {
                var file = captureDir + "1";
                if (fs.exists(file)) {
                    waitForVerifyCode = false;
                    verifyCode = fs.read(file);
                }
            });
        }

        this.sendKeys(usernameInput, username);
        this.sendKeys(passwordInput, password);
        this.sendKeys(verifyCodeInput, verifyCode);

        this.click(submitInput);
    }).wait(5000).waitForUrl(homePagePattern, function () {
        this.echo("Login successfully " + this.getCurrentUrl());
    }, function onTimeout() {
        this.echo("Can not see galaxyeye in url");
    });
});

casper.run(function() {
    this.exit(0);
});
