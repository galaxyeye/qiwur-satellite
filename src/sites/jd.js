var casper = require("casper").create();
var fs = require("fs");
var utils = require('utils');

var configure = vendor('configure').create();
var logger = vendor('logger');
var sutils = vendor('sutils');

var url = "http://search.jd.com/Search?keyword=长城葡萄酒&enc=utf-8&wq=长城葡萄酒&pvid=0uik88si.2kslfk";

casper.on('resource.requested', function (requestData, request) {
    this.echo("resource.requested : " + requestData.url);
    
    if (requestData.url.indexOf("im-x") > 0) {
        request.abort();
    }
});

casper.start(url, function () {
    var file = sutils.getTemporaryFile(url);
    fs.write(file, this.page.content, 'w');

    console.log("full page content has been saved in file : " + file);
});

casper.run(function () {
    this.exit();
});
