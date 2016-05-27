var fs = require("fs");

var casper = require("casper").create({
    clientScripts : [
        "./src/lib/client/humanize.js",
        "./src/lib/client/visualize.js",
        "./src/lib/client/clientutils.js",
        "./src/lib/client/element_traversor.js",
        "./src/lib/client/element_visitor.js"
    ],
    logLevel : "debug",
    verbose : true
});

var resourceDir = "tests/resources";
var testPage = resourceDir + "/web/detail/academic.microsoft.com/detail-0d50c3e58b5f9bbd33dba37a3c61100f.html";
// var url = "http://www.baidu.com";

casper.start(testPage, function() {
    this.evaluate(function() {
        var str = JSON.stringify({message : "JSON is supported."});
        __utils__.echo(str);
        
        // new ElementTraversor(new ElementVisitor(), {diagnosis : true}).traverse(document.body);
        new ElementTraversor(new ElementVisitor()).traverse(document.body);
    });
});

casper.run(function() {
    this.exit();
});
