/**
 * Created by vincent on 16-5-17.
 */

"use strict";

/**
 * Create a new ElementVisitor.
 */
var ElementVisitor = function() {
    // TODO : use a schema to record all features
    // this.schema = ["descend"];
    this.sequence = 0;
};

/**
 * Enter the element for the first time
 * @param ele {HTMLElement} the ele to enter
 * @param  depth {Number} the depth in the DOM
 */
ElementVisitor.prototype.head = function(ele, depth) {
    ele.setAttribute("_descend", "0");
    this.calcSelfIndicator(ele);
};

/**
 * About to leaving the the element
 * @param ele {HTMLElement} the ele visited
 */
ElementVisitor.prototype.tail = function(ele, depth) {
    var current = ele;
    var parent = current.parentNode;

    if (!parent) {
        return;
    }

    var myDescends = __qiwur_getAttributeAsInt(current, "_descend", 0);
    var lastParentDescends = __qiwur_getAttributeAsInt(parent, "_descend", 0);
    var currentParentDescends = lastParentDescends + myDescends + 1;

    // this.report(ele);

    parent.setAttribute("_descend", currentParentDescends);
};

/**
 * Calculate the give element statistic information
 * @param ele {HTMLElement} the element to calculate
 */
ElementVisitor.prototype.calcSelfIndicator = function(ele) {
    // var descend = __qiwur_getAttributeAsInt(ele, "_descend", 0);
    //
    ele.setAttribute("_seq", ++this.sequence);
};

/**
 * report the element statistic information
 * @param ele {HTMLElement} the element to report
 */
ElementVisitor.prototype.report = function(ele) {
    __utils__.echo(ele.tagName
        + (ele.id ? ("#" + ele.id) : "")
        + (ele.className ? ("#" + ele.className) : "")
        + " has " + currentParentDescends + " descends");
}
