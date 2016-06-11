const META_INFORMATION_ID = "QiwurScrapingMetaInformation";

/**
 * TODO : move all free functions into a class
 * */
function __qiwur__visualizeHumanize() {
	// traverse the DOM and compute necessary data, we must compute data before we perform humanization
	new ElementTraversor(new ElementVisitor()).traverse(document.body);

	// do some action like a real user
	__qiwur__humanize(document.body);

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
function __qiwur__searchLinks(mainAreaSelector, urlRegex) {
	var filter = Array.prototype.filter;
	var map = Array.prototype.map;

	var links = document.querySelectorAll(mainAreaSelector + " a");
	return map.call(filter.call(links, function(link) {
		return new RegExp(urlRegex).test(link.href);
	}), function(link) {
		return link.href;
	});
}

function __qiwur__relativeToAbsolute(url) {
	if (url.indexOf("//") == 0) {
		url = "http:" + url;
	}

    var arr = url.split("/") // Cut the url up into a array
    while(!!~arr.indexOf("..")){ // If there still is a ".." in the array
        arr.splice(arr.indexOf("..") - 1, 2); // Remove the ".." and the element before it.
    }
    return arr.join("/"); // Rebuild the url and return it.
}

function __qiwur_createCaptureArea(captureAreaSelector) {
	jQuery("<div class='QiwurCaptureArea' style='top:0; left:0; width:1000px; height:400px; z-index:1000; display:block'>" +
			"<div class='holder' style='position:relative; top:0px; left:20px; min-width:20px; min-height:20px; padding:0 40px; display:block'></div>" +
			"</div>")
		.prependTo('body');

	var holder = jQuery('.QiwurCaptureArea > div.holder');
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

function __qiwur_cleanCaptureArea() {
	jQuery('.QiwurCaptureArea').remove();
}

function __qiwur_insertImage(nearBy, name, imagePath) {
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
function __qiwur_getAttributeAsInt(node, attrName, defaultValue) {
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
function __qiwur_getReadableNodeName(node) {
    var name = node.tagName
    + (node.id ? ("#" + node.id) : "")
    + (node.className ? ("#" + node.className) : "");

    var seq = __qiwur_getAttributeAsInt(node, "_seq", -1);
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
function __qiwur_getCleanTextContent(textContent) {

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
function __qiwur_getMergedTextContent(nodeOrList) {
	if (!nodeOrList) {
		return "";
	}

	if (nodeOrList instanceof  Node) {
		return __qiwur_getTextContent(nodeOrList);
	}

	var content = "";
	for (var i = 0; i < nodeOrList.length; ++i) {
		if (i > 0) {
			content += " ";
		}
		content += __qiwur_getTextContent(nodeOrList[i]);
	}

	return content;
}

/**
 * Get clean node's textContent
 * @param node {Node} the node from which we extract the content
 * @return {String} The clean string, "" if no text content available.
 * */
function __qiwur_getTextContent(node) {
	if (!node || !node.textContent) {
		return "";
	}

	return __qiwur_getCleanTextContent(node.textContent);
}
