var fs = require("fs");

var casper = require("casper").create({
    logLevel : "debug",
    verbose : true
});

var url = "http://www.baidu.com";
casper.start(url, function() {
    this.evaluate(function() {
        var str = JSON.stringify({message : "JSON is supported."});
        __utils__.echo(str);
    });
});

casper.run(function() {
    this.exit();
});
