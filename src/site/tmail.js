var config = require('./../config');
var casper = require("casper").create();
var fs = require("fs");
var utils = require('./../utils');

var url = "http://list.tmall.com/search_product.htm?q=%B7%E4%C3%DB&type=p&spm=a220m.1000858.a2227oh.d100&from=.list.pc_1_searchbutton";
// url = "http://detail.tmall.com/item.htm?spm=a220m.1000858.1000725.1.FBswVu&id=25060344207&areaId=310100&cat_id=50099663&rn=b8328f2f3645e95154cd4ee4c31cea77&user_id=844537169&is_b=1#detail"

casper.on('resource.requested', function(requestData, request) {
	this.echo(requestData.url);
});

casper.start(url, function() {
	file = utils.getTemporaryFile(url);
	fs.write(file, casper.page.content, 'w');

	console.log("full page content has been saved in file : " + file);
});

casper.run(function() {
	this.exit();
});
