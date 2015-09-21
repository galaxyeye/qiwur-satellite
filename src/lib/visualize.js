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

function __qiwur__setAttribute(ele, key, value) {
    if (value != "0" && value != "0px" && value != "auto") {
        // value.match(/[1-9]d+px/g);
        ele.setAttribute(key, value);
    }
}

/**
 * TODO : use data-style to compress
 * data-style="width:100px; height:120px; ..."
 * */
function __qiwur__setVisionInfo(ele) {
    if (window.getComputedStyle) {
        var style = window.getComputedStyle(ele, null);
        __qiwur__setAttribute(ele, 'data-top', style.getPropertyValue("top"));
        __qiwur__setAttribute(ele, 'data-left', style.getPropertyValue("left"));
        __qiwur__setAttribute(ele, 'data-width', style.getPropertyValue("width"));
        __qiwur__setAttribute(ele, 'data-height', style.getPropertyValue("height"));
    }
    else {
        __qiwur__setAttribute(ele, 'data-client-height', ele.clientHeight);
        __qiwur__setAttribute(ele, 'data-client-width', ele.clientWidth);

        __qiwur__setAttribute(ele, 'data-offset-height', ele.offsetHeight);
        __qiwur__setAttribute(ele, 'data-offset-width', ele.offsetWidth);
        __qiwur__setAttribute(ele, 'data-offset-left', ele.offsetLeft);
        __qiwur__setAttribute(ele, 'data-offset-top', ele.offsetTop);

        __qiwur__setAttribute(ele, 'data-scroll-height', ele.scrollHeight);
        __qiwur__setAttribute(ele, 'data-scroll-width', ele.scrollWidth);
        __qiwur__setAttribute(ele, 'data-scroll-left', ele.scrollLeft);
        __qiwur__setAttribute(ele, 'data-scroll-top', ele.scrollTop);
    }

    // if any script error occurs, the flag can NOT be seen
    __qiwur__setAttribute(ele, 'data-visualized', 1);
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
