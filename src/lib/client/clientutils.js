const META_INFORMATION_ID = "QiwurScrapingMetaInformation";

/**
 * TODO : move all free functions into a class
 * */

function __qiwur__visualizeHumanize() {
	var metadata = document.querySelector("#" + META_INFORMATION_ID);
	if (metadata) {
        // already exists
        return;
	}

	var visionSchema = ["top", "left", "width", "height"];
    var visionSchemaString = "top-left-width-height";

	document.body.setAttribute("data-url", document.URL);

	var ele = document.createElement("input");
	ele.setAttribute("type", "hidden");
	ele.setAttribute("id", META_INFORMATION_ID);
	ele.setAttribute("data-domain", document.domain);
	/**
	 * MetaInformation version :
	 * No version : as the same as 0.1.0, the first div was selected as the holder
	 * 0.2.0 : add a input element at the end of body element
	 * 0.2.1 : add "vi" attribute for each (important) element, deprecate "data-" series 
	 * 		to deduce file size
	 * */
	// ele.setAttribute("data-version", "0.2.0");
	ele.setAttribute("data-version", "0.2.1");
	ele.setAttribute("data-url", document.URL);
	ele.setAttribute("data-base-uri", document.baseURI);
	ele.setAttribute("data-vision-schema", visionSchemaString);
	document.body.appendChild(ele);

	__qiwur__visualize(document.body, visionSchema);
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

	// __utils__.echo('------------');
	// __utils__.echo(mainAreaSelector + " a");

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
