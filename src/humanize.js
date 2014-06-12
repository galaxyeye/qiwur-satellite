/**
 * Fire an event handler to the specified node. Event handlers can detect that
 * the event was fired programatically by testing for a 'synthetic=true'
 * property on the event object
 * 
 * @param {HTMLNode}
 *            node The node to fire the event handler on.
 * @param {String}
 *            eventName The name of the event without the "on" (e.g., "focus")
 */
function __qiwur__fireEvent(node, eventName) {
	// Make sure we use the ownerDocument from the provided node to avoid
	// cross-window problems
	var doc;
	if (node.ownerDocument) {
		doc = node.ownerDocument;
	} else if (node.nodeType == 9) {
		// the node may be the document itself, nodeType 9 = DOCUMENT_NODE
		doc = node;
	} else {
		throw new Error("Invalid node passed to fireEvent: " + node.id);
	}

	if (node.dispatchEvent) {
		// Gecko-style approach (now the standard) takes more work
		var eventClass = "";

		// Different events have different event classes.
		// If this switch statement can't map an eventName to an eventClass,
		// the event firing is going to fail.
		switch (eventName) {
		case "click": // Dispatching of 'click' appears to not work correctly
						// in Safari. Use 'mousedown' or 'mouseup' instead.
		case "mousedown":
		case "mouseup":
		case "mouseover":
			eventClass = "MouseEvents";
			break;

		case "focus":
		case "change":
		case "blur":
		case "select":
			eventClass = "HTMLEvents";
			break;

		default:
			throw "fireEvent: Couldn't find an event class for event '"
					+ eventName + "'.";
			break;
		}
		var event = doc.createEvent(eventClass);

		var bubbles = eventName == "change" ? false : true;
		event.initEvent(eventName, bubbles, true); // All events created as
													// bubbling and cancelable.

		event.synthetic = true; // allow detection of synthetic events
		node.dispatchEvent(event, true);
	} else if (node.fireEvent) {
		// IE-old school style
		var event = doc.createEventObject();
		event.synthetic = true; // allow detection of synthetic events
		node.fireEvent("on" + eventName, event);
	}
};

function __qiwur__humanize(doc) {
	// mouse over and click each link, notice that the navigation is locked, so it's OK to click the link
	// notice : do not use document.links since it ignores <a> tag without href attribute
	var links = doc.getElementsByTagName("a");
	for (var i = 0; i < links.length; ++i) {
		var link = links[i];

		var noTarget = !link.href;
		noTarget |= link.href.indexOf('void') == 0;
		noTarget |= link.href.indexOf('#') == 0;
		noTarget |= link.href.indexOf('java') == 0;
		noTarget |= link.href.indexOf('script') == 0;

		var hasEvent = link.hasAttribute('onmousedown');
		hasEvent |= link.hasAttribute('onmouseup');
		hasEvent |= link.hasAttribute('onmouseover');
		hasEvent |= link.hasAttribute('onclick');

		if (noTarget || hasEvent) {
			__qiwur__fireEvent(link, 'mousedown');
			__qiwur__fireEvent(link, 'mouseup');
			__qiwur__fireEvent(link, 'mouseover');
			__qiwur__fireEvent(link, 'click');

	    	// if any script error occurs, the flag can NOT be seen
			link.setAttribute('data-event-fired', 1);
		}
	}

	var fireImageEvent = false;
	if (fireImageEvent) {
		// mouse over and click each image
		var images = doc.getElementsByTagName("img");
		for (var i = 0; i < images.length; ++i) {
			var image = images[i];

			__qiwur__fireEvent(image, 'mousedown');
			__qiwur__fireEvent(image, 'mouseup');
			__qiwur__fireEvent(image, 'mouseover');
			__qiwur__fireEvent(image, 'click');

	    	// if any script error occurs, the flag can NOT be seen
			image.setAttribute('data-event-fired', 1);
		}
	}
}
