var config = require('./../config');
var casper = require('casper').create();
var utils = require('utils');

var regex = "http://tuan.ctrip.com/group/(.+)";
var pattern = new RegExp(regex);
var str = "http://tuan.ctrip.com/group/2084529.html#ctm_ref=grt_sr_pm_def_b";

casper.echo(pattern.test(str));
