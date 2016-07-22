var utils = require('utils');
var configure = vendor('configure').create();

casper.test.begin('load site', 2, function suite(test) {
	var site = configure.loadSite("academic.microsoft.com");

    test.assertEquals(site.name, "academic.microsoft.com");

    var entity = configure.loadSiteObject("academic.microsoft.com", "tests/resources/config/sites.json");
    test.assertEquals(entity.name, "academic.microsoft.com");

    test.done();
});
