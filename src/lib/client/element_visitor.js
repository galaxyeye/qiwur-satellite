/**
 * Created by vincent on 16-5-17.
 *
 * Element Visitor : used with Element ElementTraversor together
 */

// TODO : record all features required
const VISION_SCHEMA = ["top", "left", "width", "height"];
const VISUALIZE_TAGS = ["BODY", "DIV", "A", "IMG", "TABLE", "UL", "DL", "H1", "H2", "H3"];
const VISION_SCHEMA_STRING = "top-left-width-height";

"use strict";

/**
 * Create a new WarpsElementVisitor.
 */
var WarpsElementVisitor = function() {
    // this.schema = ["descend"];
    this.sequence = 0;
    this.stopped = false;

    var metadata = document.querySelector("#" + META_INFORMATION_ID);
    if (metadata) {
        // already exists
        this.stopped = true;
        return;
    }

    this.generateMetadata();
};

/**
 * Generate meta data
 *
 * MetaInformation version :
 * No version : as the same as 0.1.0, the first div was selected as the holder
 * 0.2.0 : add a input element at the end of body element
 * 0.2.1 : add "vi" attribute for each (important) element, deprecate "data-" series
 * 		to deduce file size
 * 0.2.2 : coming soon...
 * */
WarpsElementVisitor.prototype.generateMetadata = function() {
    document.body.setAttribute("data-url", document.URL);

    var ele = document.createElement("input");
    ele.setAttribute("type", "hidden");
    ele.setAttribute("id", META_INFORMATION_ID);
    ele.setAttribute("data-domain", document.domain);
    ele.setAttribute("data-version", "0.2.1");
    ele.setAttribute("data-url", document.URL);
    ele.setAttribute("data-base-uri", document.baseURI);
    ele.setAttribute("data-vision-schema", VISION_SCHEMA_STRING);

    document.body.appendChild(ele);
};

/**
 * Check if stopped
 */
WarpsElementVisitor.prototype.isStopped = function() {
    return this.stopped;
};

/**
 * Enter the element for the first time
 * @param ele {HTMLElement} the ele to enter
 * @param  depth {Number} the depth in the DOM
 */
WarpsElementVisitor.prototype.head = function(ele, depth) {
    ele.setAttribute("_descend", "0");
    ele.setAttribute("_depth", depth.toString());

    this.calcSelfIndicator(ele);

    this.makeUrlAbsolute(ele);
};

/**
 * About to leaving the the element
 * @param ele {HTMLElement} the ele visited
 * @param  depth {Number} the depth in the DOM
 */
WarpsElementVisitor.prototype.tail = function(ele, depth) {
    var current = ele;
    var parent = current.parentNode;

    if (!parent) {
        return;
    }

    var myDescends = __warps_getAttributeAsInt(current, "_descend", 0);
    var lastParentDescends = __warps_getAttributeAsInt(parent, "_descend", 0);
    var currentParentDescends = lastParentDescends + myDescends + 1;

    // this.report(ele);

    parent.setAttribute("_descend", currentParentDescends);

    // if (VISUALIZE_TAGS.indexOf(ele.tagName) != -1) {
    // }
    // Calculate every element's vision information
    var vision = __warps__getVisionInfo(ele, VISION_SCHEMA);
    if (vision) {
        ele.setAttribute('vi', vision);
    }
};

/**
 * Calculate the give element statistic information
 * @param ele {HTMLElement} the element to calculate
 */
WarpsElementVisitor.prototype.makeUrlAbsolute = function(ele) {
    var urls = {
        href : ele.getAttribute("href"),
        src : ele.getAttribute("src"),
        "data-src" : ele.getAttribute("data-src")
    };

    for (var name in urls) {
        if (urls[name]) {
            var absoluteUrl = __warps__relativeToAbsolute(urls[name]);
            ele.setAttribute(name, absoluteUrl);
        }
    }
};

/**
 * Calculate the give element statistic information
 * @param ele {HTMLElement} the element to calculate
 */
WarpsElementVisitor.prototype.calcSelfIndicator = function(ele) {
    // var descend = __warps_getAttributeAsInt(ele, "_descend", 0);
    //
    ele.setAttribute("_seq", (++this.sequence).toString());
};

/**
 * Report the element statistic information
 * @param ele {HTMLElement} the element to report
 */
WarpsElementVisitor.prototype.report = function(ele) {
    var descends = __warps_getAttributeAsInt(ele, "_descend", 0);

    __utils__.echo(ele.tagName
        + (ele.id ? ("#" + ele.id) : "")
        + (ele.className ? ("#" + ele.className) : "")
        + " has " + descends + " descends");
};

/**
 * Get or set data with given name and value
 * */
WarpsElementVisitor.prototype.data = function(ele, name, value) {
    if (!ele.data) {
        ele.data = [];
    }

    if (!value) {
        return ele.data[name] ? ele.data[name] : undefined;
    }

    ele.data[name] = value;
};
