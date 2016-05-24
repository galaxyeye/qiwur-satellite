/**
 * Created by vincent on 16-5-17.
 */

/**
 * Create a new traversor.
 * @param visitor a class implementing the {@link NodeVisitor} interface, to be called when visiting each node.
 */
function NodeTraversor(visitor) {
    "use strict";
    this.visitor = visitor;
}

/**
 * Start a depth-first traverse of the root and all of its descendants.
 * @param root HTMLElement the root node point to traverse.
 */
NodeTraversor.prototype.traverse = function(root) {
    if (!root) {
        __utils__.log("Invalid root to traverse.", "warn");
        return;
    }

    var node = root;
    var depth = 0;

    while (node) {
        this.visitor.head(node, depth);

        if (node.childNodes.length > 0) {
            node = node.childNodes.item(0);
            depth++;
        } else {
            while (node.nextSibling && depth > 0) {
                this.visitor.tail(node, depth);
                node = node.parentNode;
                depth--;
            }

            this.visitor.tail(node, depth);
            if (node == root) {
                break;
            }
            node = node.nextSibling;
        }
    }
};
