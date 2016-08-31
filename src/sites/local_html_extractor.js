"use strict";

var utils = require('utils');
var fs = require('fs');

var logger = vendor('logger');
var configure = vendor('configure').create();

// TODO : phantom.libraryPath seems no use
var casper = require("casper").create({
    clientScripts : ['./src/lib/client/dist/satellite.min.js'],
    pageSettings : {
        loadImages : false
    }
});

var limit = 3;
var resourceDir = "/home/vincent/Data/warps/satellite/web/jd.com/08.24/detail";

// Get a list all files in directory
var uris = [];
fs.list(resourceDir).filter(function (uri) {
    return uri.indexOf("html") > 0 && !fs.isFile(uri);
}).forEach(function(uri) {
    uris.push(resourceDir + "/" + uri);
});

casper.start("about:blank", function() {
    extractDocument.call(this, uris);
});

var i = 0;
var extractDocument = function(uris) {
    if (uris.length == 0) {
        return;
    }

    if (i++ >= limit) {
        this.echo("Hit limit " + limit + ", exit.");
        return;
    }

    var uri = uris.pop();

    this.echo("\n");
    this.echo("Process the " + i + "th document: " + uri, 'COMMENT');

    this.thenOpen(uri, function() {
        var fields = this.evaluate(function (extractor) {
            return new WarpsDomExtractor(extractor, null).extract(null);
        }, {extractor : options.extractor});
        utils.dump(fields);
    }).then(function () {
        extractDocument.call(this, uris);
    });
};

casper.run(function() {
    this.exit(0);
});
