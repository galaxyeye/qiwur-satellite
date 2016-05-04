var config = require('../lib/config');
var casper = require('casper').create();
var utils = require('utils');
var fs = require('fs');

var entityCrawler = require('../lib/entity_crawler').create();

console.log(fs.workingDirectory);

entityCrawler.echo('academic.microsoft.com');
entityCrawler.start('academic.microsoft.com');
