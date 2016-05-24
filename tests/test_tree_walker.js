var resourceDir = "tests/resources";
var testPage = resourceDir + "/web/detail/academic.microsoft.com/detail-0d50c3e58b5f9bbd33dba37a3c61100f.html";

var events = vendor('events').create(casper);
casper.options.clientScripts.push("./src/lib/client/clientutils.js");
casper.options.clientScripts.push("./src/lib/client/node_traversor.js");
casper.options.clientScripts.push("./src/lib/client/node_visitor.js");

casper.test.begin('tree walker tests', 3, function(test) {
    casper.start(testPage, function() {

        test.assertEval(
            function() {
                var treeWalker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode : function(node) { return NodeFilter.FILTER_ACCEPT; }
                    },
                    false
                );
                var nodeList = [];
                while(treeWalker.nextNode()) {
                    nodeList.push(treeWalker.currentNode);
                }
                return nodeList.length > 0;
            },
            "Walked through the tree"
        );

        test.assertEval(
            function() {
                var treeWalker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode : function(node) { return NodeFilter.FILTER_ACCEPT; }
                    },
                    false
                );

                var maxDescend = 0;
                document.body.setAttribute("data-descend", "0");

                while(treeWalker.nextNode()) {
                    var currentElement = treeWalker.currentNode;
                    var parentElement = currentElement.parentElement;

                    var descend = __qiwur_getAttributeAsInt(currentElement, "data-descend", 0);
                    var lastParentDescend = __qiwur_getAttributeAsInt(parentElement, "data-descend", 0);

                    var currentParentDescend = lastParentDescend + descend + 1;
                    parentElement.setAttribute("data-descend", currentParentDescend);
                    
                    if (currentParentDescend > maxDescend) {
                        maxDescend = currentParentDescend;
                    }
                }

                return parseInt(maxDescend) > 0;
            },
            "Walked through the tree and compute vision feature using build in Tree Walker"
        );

        test.assertEval(
            function() {
                
                new NodeTraversor(new NodeVisitor()).traverse(document.body);
                
                return true;
            },
            "Walked through the tree and compute vision feature"
        );
        
    }).run(function() {
        test.done();
    });
});
