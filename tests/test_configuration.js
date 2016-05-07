require(fs.absolute("bootstrap"));
var utils = require('utils');

casper.test.begin('load site', 2, function suite(test) {
	var site = config.loadSite("academic.microsoft.com");

    test.assertEquals(site.name, "academic.microsoft.com");
});

casper.exit();
