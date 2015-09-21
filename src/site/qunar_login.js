var system = require('system');
var process = require('child_process');
var spawn = process.spawn;
var config = require('./../config');
var sateutils = require('./../lib/utils');

var Defaultconf = {
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

conf = config.mergeConfig(Defaultconf, config.loadConfig().fetcher);

var casper = require('casper').create(
	{
		clientScripts : ['../lib/humanize.js', '../lib/visualize.js',
		                 '../lib/clientutils.js', '../lib/jquery-1.11.2.js'],
		pageSettings : {
			loadImages : true,
			loadPlugins : false,
			userAgent : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
		},
		viewportSize : { width: conf.viewportWidth, height: conf.viewportHeight },
		logLevel : "debug",
		verbose : true
	});

var captcha = null;

casper.on('remote.message', function(msg) {
	this.echo('remote message caught:' + msg);
});

casper.on('page.error', function(msg, trace) {
	this.echo('Page Error:' + msg, 'ERROR');
});

casper.on('resource.received', function(resource) {
	this.echo(resource.url);
});

// casper.on('onPageInitialized', function() {
// });

var url = "https://user.qunar.com/passport/login.jsp";
casper.start(url, function() {
	// this.captureSelector('captcha.jpg', '#vcodeImg');
	console.log('login page loaded');
	// this.test.assertExists('form#loginForm', 'form is found');

	// this.download(this.getElementAttribute('#vcodeImg', 'src'), 'captcha');
//	this.evaluate(function(captureAreaSelector) {
//		__qiwur_createCaptureArea(captureAreaSelector);
//	}, "#loginForm");

//	this.captureSelector("/tmp/captcha.png", ".QiwurCaptureArea > div.holder");
	this.capture("/tmp/captcha.png");
	var child = spawn('eog', [ '/tmp/captcha.png' ]);

	child.stdout.on('data', function(data) {
		console.log('spawnSTDOUT:', JSON.stringify(data));
	});
	child.stderr.on('data', function(data) {
		console.log('spawnSTDERR:', JSON.stringify(data));
	});
	child.on('exit', function(data) {
		console.on('spawnEXIT:', code);
	});

	var captcha = system.stdin.readLine();
	system.stdout.writeLine(JSON.stringify(captcha));

	this.fill('form#loginForm', {
		username : 'micromemory@yeah.net',
		password : 'IIOLIO556356',
		token : this.getElementAttribute('#token', 'value'),
		vcode : captcha
	}, true);
});

//casper.thenOpen("http://user.qunar.com/index/page");
casper.waitFor(function() {
	return url !== this.getCurrentUrl();
}).thenEvaluate(function() {
	__utils__.echo('Page Title: ' + document.title);
	__utils__.echo('Your name is: '
			+ document.querySelector('.q_header_uname').textContent);
});

/*
 * casper.then(function() { this.fillSelectors('form#loginForm', {
 * 'input[name="username"]': 'micromemory@yeah.net', 'input[name="password"]':
 * 'IIOLIO556356', 'input[name="vcode"]': captcha, }, false);
 * this.click('#submit'); }); casper.then(function() {
 * this.open('http://order.qunar.com/', function() { this.echo(this.getTitle());
 * }); });
 */

casper.run();
