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
function __qiwur__setVisionInfo(ele) {
	ele.setAttribute('data-offset-height', ele.offsetHeight);
	ele.setAttribute('data-offset-width', ele.offsetWidth);
	ele.setAttribute('data-offset-left', ele.offsetLeft);
	ele.setAttribute('data-offset-top', ele.offsetTop);

	ele.setAttribute('data-scroll-height', ele.scrollHeight);
	ele.setAttribute('data-scroll-width', ele.scrollLeft);
	ele.setAttribute('data-scroll-left', ele.scrollTop);
	ele.setAttribute('data-scroll-parent', ele.scrollWidth);

	// if any script error occurs, the flag can NOT be seen
	ele.setAttribute('data-visualized', 1);
};

function __qiwur__visualize(doc) {
	var links = doc.getElementsByTagName("a");
	for (var i = 0; i < links.length; ++i) {
		__qiwur__setVisionInfo(links[i]);
	}

	var images = doc.getElementsByTagName("img");
	for (var i = 0; i < images.length; ++i) {
		__qiwur__setVisionInfo(images[i]);
	}
}
