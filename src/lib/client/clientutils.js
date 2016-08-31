const META_INFORMATION_ID = "QiwurScrapingMetaInformation";

/**
 * Check if the variables are defined
 * @param variables object with format : {varName1 : var1, varName2 : var2, ..., varNameN : varN}
 * @return object A json object to report the existence of each variable
 * */
function __warps__checkVariables(variables) {
	"use strict";

	var report = {};
	for (var variable in variables) {
		if (variables[variable] != undefined) {
			report[variable] = typeof(variables[variable]);
		}
		else {
			report[variable] = false;
		}
	}
	return report;
}


/**
 * Clones an object.
 *
 * @param  Mixed  o
 * @return Mixed
 */
function __warps__clone(o) {
	"use strict";
	return JSON.parse(JSON.stringify(o));
}

/**
 * Object recursive merging utility.
 *
 * @param  {Object}  origin  the origin object
 * @param  {Object}  add     the object to merge data into origin
 * @param  {Object}  opts    optional options to be passed in
 * @return {Object}
 */
function __warps__mergeObjects(origin, add, opts) {
	"use strict";

	if (!add) {
		return origin;
	}
	
	var options = opts || {},
		keepReferences = options.keepReferences;

	for (var p in add) {
		if (add[p] && add[p].constructor === Object) {
			if (origin[p] && origin[p].constructor === Object) {
				origin[p] = __warps__mergeObjects(origin[p], add[p]);
			} else {
				origin[p] = keepReferences ? add[p] : __warps__clone(add[p]);
			}
		} else {
			origin[p] = add[p];
		}
	}
	
	return origin;
}

/**
 * TODO : move all free functions into a class
 * */
function __warps__visualizeHumanize() {
	"use strict";

	// traverse the DOM and compute necessary data, we must compute data before we perform humanization
	new WarpsElementTraversor(new WarpsElementVisitor()).traverse(document.body);

	// do some action like a real user
	__warps__humanize(document.body);

	// if any script error occurs, the flag can NOT be seen
	document.body.setAttribute("data-error", '0');
}

/**
 * Fetch all <a> elements from the page and return
 * the ones which contains a href starting with 'http://'
 * 
 * @param mainAreaSelector main area selector
 * @param urlRegex url regex in main area
 * 
 * */
function __warps__searchLinks(mainAreaSelector, urlRegex) {
	var filter = Array.prototype.filter;
	var map = Array.prototype.map;

	var links = document.querySelectorAll(mainAreaSelector + " a");
	var urls = map.call(filter.call(links, function(link) {
		return new RegExp(urlRegex).test(link.href);
	}), function(link) {
		// TODO : add a normalize util
		var pos = link.href.indexOf("#");
		return link.href.substring(0, pos == -1 ? 200 : pos);
	});

	// make it unique
	urls = urls.sort().filter(function(link, i, arr) {
		return link && link.length > 0 && (i == arr.indexOf(link));
	});

	return urls;
}

function __warps__relativeToAbsolute(url) {
	if (url.indexOf("//") == 0) {
		url = "http:" + url;
	}

    var arr = url.split("/") // Cut the url up into a array
    while(!!~arr.indexOf("..")){ // If there still is a ".." in the array
        arr.splice(arr.indexOf("..") - 1, 2); // Remove the ".." and the element before it.
    }
    return arr.join("/"); // Rebuild the url and return it.
}

function __warps_createCaptureArea(captureAreaSelector) {
	// TODO : remove dependency to jQuery
	jQuery("<div class='WarpsCaptureArea' style='position:absolute; top:0; left:0; min-width:1000px; min-height:1000px; z-index:1000; display:block'>" +
			"<div class='holder' style='position:absolute; top:0px; left:20px; min-width:20px; min-height:20px; padding:0 40px; display:block'></div>" +
			"</div>")
		.prependTo('body');

	var holder = jQuery('.WarpsCaptureArea > div.holder');
	var target = jQuery(captureAreaSelector);
	// __utils__.echo("Target tag name " + target.prop('tagName'));
	var counter = 4;
	while (target.prop('tagName') != 'DIV' && counter-- > 0) {
		target = target.parent();
	}
	holder.append(target.clone());
	holder.width(target.width());
	holder.height(target.height());
}

function __warps_cleanCaptureArea() {
	jQuery('.WarpsCaptureArea').remove();
}

function __warps_insertImage(nearBy, name, imagePath) {
	var counter = 4;
	var neighbor = jQuery(nearBy);
	while (neighbor.prop('tagName') != 'DIV' && counter-- > 0) {
		neighbor = neighbor.parent();
	}

	var insert = neighbor.clone().html('')
		.attr('class', 'monitor-inserted')
		.attr('name', name)
		.attr('value', imagePath)
		.attr('label', 'Captured');
	var image = "<img src='" + imagePath + "' />";
	insert.append('<div>' + name + '</div>');
	insert.append('<div>' + image + '</div>');

	neighbor.after(insert);
}

/**
 * Get attribute as an integer
 * */
function __warps_getAttributeAsInt(node, attrName, defaultValue) {
    if (!defaultValue) {
        defaultValue = 0;
    }

    var value = node.getAttribute(attrName);
    if (!value) {
        value = defaultValue;
    }

    return parseInt(value);
}

/**
 * Get attribute as an integer
 * */
function __warps_getReadableNodeName(node) {
    var name = node.tagName
    + (node.id ? ("#" + node.id) : "")
    + (node.className ? ("#" + node.className) : "");

    var seq = __warps_getAttributeAsInt(node, "_seq", -1);
    if (seq >= 0) {
        name += "-" + seq;
    }

    return name;
}

/**
 * Clean node's textContent
 * @param textContent {String} the string to clean
 * @return {String} The clean string
 * */
function __warps_getCleanTextContent(textContent) {

	// all control characters
	// @see http://www.asciima.com/
	textContent = textContent.replace(/[\x00-\x1f]/g, " ");

	// combine all blanks into one " " character
	textContent = textContent.replace(/\s+/g, " ");

	return textContent.trim();
}

/**
 * Get clean, merged textContent from node list
 * @param nodeOrList {NodeList|Array|Node} the node from which we extract the content
 * @return {String} The clean string, "" if no text content available.
 * */
function __warps_getMergedTextContent(nodeOrList) {
	if (!nodeOrList) {
		return "";
	}

	if (nodeOrList instanceof  Node) {
		return __warps_getTextContent(nodeOrList);
	}

	var content = "";
	for (var i = 0; i < nodeOrList.length; ++i) {
		if (i > 0) {
			content += " ";
		}
		content += __warps_getTextContent(nodeOrList[i]);
	}

	return content;
}

/**
 * Get clean node's textContent
 * @param node {Node} the node from which we extract the content
 * @return {String} The clean string, "" if no text content available.
 * */
function __warps_getTextContent(node) {
	if (!node || !node.textContent) {
		return "";
	}

	return __warps_getCleanTextContent(node.textContent);
}
