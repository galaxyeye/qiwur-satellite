/**
 * Created by vincent on 16-5-17.
 */

"use strict";

/**
 * Create a new traversor.
 * @param visitor {ElementVisitor} a class implementing the {@link ElementVisitor} interface, to be called when visiting each ele.
 * @param options {Object} options, currently, only one option : options.diagnosis(= false);
 */
function ElementTraversor(visitor) {
    this.visitor = visitor;
    this.options = {
        diagnosis : false
    };

    var options = null;
    if (arguments.length > 1) {
        options = arguments[1];
    }
    if (options) {
        // override default options
        for (var prop in options) {
            if (options[prop]) {
                this.options[prop] = options[prop];
            }
        }
    }
}

/**
 * Start a depth-first traverse of the root and all of its descendants.
 * @param root {HTMLElement} the root ele point to traverse.
 */
ElementTraversor.prototype.traverse = function(root) {
    if (!root) {
        __utils__.log("Invalid root to traverse.", "warn");
        return;
    }
    
    var ele = root;
    var depth = 0;
    
    while (ele) {
        this.visitor.head(ele, depth);

        if (ele.children.length > 0) {
            ele = ele.children[0];
            depth++;
        } else {
            while (!ele.nextElementSibling && depth > 0) {
                this.visitor.tail(ele, depth);
                ele = ele.parentNode;
                depth--;
                
                if (this.options.diagnosis) {
                    this.diagnosis(ele);
                }
            }
            
            this.visitor.tail(ele, depth);
            if (ele == root) {
                // __utils__.echo("-----back to root, depth " + depth);
                break;
            }
            
            ele = ele.nextElementSibling;
        }
    }
};

ElementTraversor.prototype.diagnosis = function(ele, depth) {
    var info = ele + ", nodeType : " + ele.nodeType + ", nodeName : " + ele.nodeName;

    if (ele.nodeName === "A") {
        info += ", children count : " + ele.children.length;
        for (var i = 0; i < ele.children.length; ++i) {
            info += ", " + ele.children[i].nodeName;
        }
    }

    __utils__.echo(info);
};
