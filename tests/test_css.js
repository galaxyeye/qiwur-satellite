var resourceDir = "tests/resources";
var testPage = resourceDir + "/web/index/warpspeed.cn/crawls.html";

var events = vendor('events').create(casper);
casper.options.clientScripts.push("./src/lib/client/dist/satellite.full.js");

/**
 * This test shows the basic behavior of the css manipulations
 * */
casper.test.begin('test css selector with collection', 3, function suite(test) {
    casper.start(testPage, function() {

        test.assertEvalEquals(
            function() {
                var nodeList = __utils__.findAll("tr:nth-child(1)");
                return nodeList.length;
            },
            2,
            "all tr elements who is the first child of it's parent"
        );

        test.assertEvalEquals(
            function() {
                var nodeList = __utils__.findAll("tbody > tr:nth-child(1)");
                return nodeList.length;
            },
            1,
            "all tr elements (inside tbody) who is the first child of it's parent"
        );

        test.assertEvalEquals(
            function() {
                var rule = {
                    collection : "div.content tbody tr",
                    key : "td:nth-child(2)",
                    value : "td:nth-child(4)"
                };

                var results = [];
                var nodeList = __utils__.findAll(rule.collection, document.body);

                for (var i = 0; i < nodeList.length; ++i) {
                    var node = nodeList[i];

                    var k = __utils__.findAll(rule.key, node);
                    var v = __utils__.findAll(rule.value, node);

                    if (k && v) {
                        var item = [__qiwur_getMergedTextContent(k), __qiwur_getMergedTextContent(v)];
                        results.push(item);
                    }

                    __utils__.echo(i + " : " +
                        __qiwur_getReadableNodeName(node) +
                        ", " + rule.key +
                        ", " + rule.value +
                        ", " + (k ? __qiwur_getMergedTextContent(k) : "") +
                        " : " + (v ? __qiwur_getMergedTextContent(v) : "")
                    );
                }

                return results.length;
            },
            20,
            "extract KV pairs using css selector"
        );
    }).run(function() {
        test.done();
    });
});
