var config = require('../lib/config');
var casper = require('casper').create();
var utils = require('utils');

function testRegex() {
	var regex = "http://tuan.ctrip.com/group/(.+)";
	var pattern = new RegExp(regex);
	var str = "http://tuan.ctrip.com/group/2084529.html#ctm_ref=grt_sr_pm_def_b";

	casper.echo(pattern.test(str));
}

function testReplace() {
	var content = '<link rel="dns-prefetch" href="//img11.360buyimg.com"/><img src="//img11.360buyimg.com/n4/jfs/t1819/138/1548989957/118248/a0fdc110/55f796b7N9ebe9fb5.jpg" data-img="1" width="100" height="100" />';
	content = content.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");
	casper.echo(content);	
}

testRegex();
casper.echo("");
testReplace();

phantom.exit();
