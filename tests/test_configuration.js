var utils = require('utils');
var configure = vendor('configure').create();

casper.test.begin('load site', 1, function suite(test) {
    // var entity = configure.loadSiteObject("academic.microsoft.com");
    // test.assertEquals(entity.name, "academic.microsoft.com");

    var entity = configure.loadSiteObject("academic.microsoft.com", "tests/resources/config/sites.json");
    test.assertEquals(entity.name, "academic.microsoft.com");

    test.done();
});

casper.test.begin('load config/sites/jd.com', 1, function suite(test) {
    var site = configure.loadSiteObject("jd.com", "tests/resources/config/jd.com.json");

    test.assertEquals(site.name, "jd.com");

    utils.dump(site);

    test.done();
});

casper.test.begin('build objects', 1, function suite(test) {
    var properties = {
        "a.b" : "a",
        "a.c" : "ac",
        "a.d.e" : "ade",
        "a.d.f" : "adf"
    };

    var obj = configure.buildObject(properties);

    utils.dump(obj);
    
    test.assertEquals(obj.a.b, "a");

    test.done();
});
