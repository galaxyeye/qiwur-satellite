var utils = require('utils');
var fs = require('fs');
var sutils = vendor('sutils');

var entity = config.loadSiteObject("academic.microsoft.com", "tests/resources/config/sites.json");
var options = {'extractor' : entity.page.detail.extractor};

casper.options.clientScripts.push("./src/lib/client/extractor.js");
casper.options.clientScripts.push("./src/lib/client/jquery-1.11.2.js");

var resourceDir = "tests/resources";
var testPage = resourceDir + "/web/detail/academic.microsoft.com/detail-0d50c3e58b5f9bbd33dba37a3c61100f.html";

var events = vendor('events').create(casper);

casper.test.begin('extractor tests', 5, function(test) {
    casper.start(testPage, function() {
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

        // Extract using Satellite method
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extractByRegex(extractor.regex);
                return fields.length;
            },
            1,
            "Extract using satellite.Extractor.extractByRegex",
            {extractor : options.extractor}
        );

        // Extract using Satellite method
        test.assertEvalEquals(
            function(extractor) {
                var fields = new Extractor(extractor).extract();
                return fields.length;
            },
            5,
            "Extract using Satellite method",
            {extractor : options.extractor}
        );
    }).run(function() {
        test.done();
    });
});
