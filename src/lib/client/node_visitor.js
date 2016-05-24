/**
 * Created by vincent on 16-5-17.
 */

/**
 * Create a new NodeVisitor.
 * @param visitor a class implementing the {@link NodeVisitor} interface, to be called when visiting each node.
 */
var NodeVisitor = function() {
};

NodeVisitor.prototype.head = function(node, depth) {
    "use strict";

    node.setAttribute("data-descend", "0");

    this.calcSelfIndicator(node);
};

NodeVisitor.prototype.tail = function(node, depth) {
    "use strict";

    var currentElement = node;
    var parentElement = currentElement.parentElement;

    if (!parentElement) {
        return;
    }
    
    var lastParentDescend = __qiwur_getAttributeAsInt(parentElement, "data-descend", 0);
    var currentParentDescend = lastParentDescend + 1;

    __utils__.echo(currentParentDescend);
    
    parentElement.setAttribute("data-descend", currentParentDescend);
};

NodeVisitor.prototype.calcSelfIndicator = function(node) {
    "use strict";
    
    var descend = __qiwur_getAttributeAsInt(node, "data-descend", 0);

    node.setAttribute("data-descend", descend + 1);
};
