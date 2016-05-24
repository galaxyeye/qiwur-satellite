var utils = require('utils');

casper.test.begin('load site', 1, function suite(test) {
	var site = config.loadSite("academic.microsoft.com");

    test.assertEquals(site.name, "academic.microsoft.com");

    test.done();
});
