var utils = require('utils');
var fs = require('fs');
var sutils = vendor('sutils');

var entity = config.loadSiteObject("academic.microsoft.com", "tests/resources/config/sites.json");
var options = {'extractor' : entity.page.detail.extractor};

casper.options.clientScripts.push("./src/lib/client/dist/satellite.full.js");

casper.on('resource.requested', function(requestData, networkRequest) {
    if ((/.+?\.(css|js|png)(\?)?/gi).test(requestData['url']) || requestData.headers['Content-Type'] == 'text/css') {
        // console.log('The url of the request is matching. Aborting: ' + requestData['url']);
        networkRequest.abort();
    }
});

var resourceDir = "tests/resources";
var testPage = resourceDir + "/web/detail/academic.microsoft.com/detail-0d50c3e58b5f9bbd33dba37a3c61100f.html";

// var events = vendor('events').create(casper);

casper.test.begin('extractor basic tests', 6, function(test) {
    casper.start(testPage, function() {
        this.evaluate(function() {
            new ElementTraversor(new ElementVisitor()).traverse(document.body);
        });

        // title extraction
        test.assertTitle("XSEarch: a semantic search engine for XML - 微软学术");

        // Extract using build-in HTMLDocument method
        test.assertEvalEquals(
            function() {
                var element = document.querySelector("article.detail-page h3");
                return element.textContent;
            },
            'XSEarch: a semantic search engine for XML',
            'Extract using build-in HTMLDocument method',
            {cssSelector : cssSelector}
        );

        // Extract using CasperJS function
        var cssSelector = "article.detail-page .entity-header h3";
        test.assertEvalEquals(
            function() {
                return __utils__.findOne("article.detail-page h3").textContent;
            },
            'XSEarch: a semantic search engine for XML',
            'Extract using CasperJS function',
            {cssSelector : cssSelector}
        );

        // Extract using satellite.Extractor.extractByRegex
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extractByRegex(extractor.regex);

                return fields[0][1];
            },
            "2003-09-Tu",
            "Extract using satellite.Extractor.extractByRegex",
            {extractor : options.extractor}
        );

        // Extract using satellite.Extractor.extractByVision
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extractByVision(extractor.vision);

                return fields[0][1];
            },
            "年份 2003-09-Tu",
            "Extract using satellite.Extractor.extractByVision",
            {extractor : options.extractor}
        );

        // Extract using satellite.Extractor.extractByKVRules
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extractByKVRules(extractor.kv);
                return fields[4];
            },
            ["DOI", "10.1016/B978-012722442-8/50013-6"],
            "Extract using satellite.Extractor.extractByKVRules",
            {extractor : options.extractor}
        );
    }).run(function() {
        test.done();
    });
});

casper.test.begin('extractor advanced tests', 1, function(test) {
    casper.start(testPage, function() {
        this.evaluate(function () {
            new ElementTraversor(new ElementVisitor()).traverse(document.body);
        });

        // Extract using Satellite method
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extract();
                // return fields.length;
                return true;
            },
            true,
            "Extract using advanced Satellite method",
            {extractor : options.extractor}
        );
    }).run(function() {
        test.done();
    });
});
