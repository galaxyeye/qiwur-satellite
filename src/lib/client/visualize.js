/**
 * TODO : move all free functions into a class
 * */

/**
 * Get element offset
 * @return [top, left]
 * */
function __warps__getOffset(ele) {
    var x = 0;
    var y = 0;

    while(ele && !isNaN(ele.offsetLeft) && !isNaN(ele.offsetTop)) {
    	x += ele.offsetLeft - ele.scrollLeft;
        y += ele.offsetTop - ele.scrollTop;

        ele = ele.offsetParent;
    }

    return { top: y, left: x };
}

/**
 * Set robot(monitor) defined element attribute
 * @return [top, left]
 * */
function __warps__setAttribute(ele, key, value) {
    if (value != "0" && value != "0px" && value != "auto") {
        // or use regex : value.match(/[1-9]d+px/g);
        ele.setAttribute(key, value);
    }
}

/**
 * @Deprecated
 * */
function __qiwur__setVisionInfoFull(ele) {
	var offset = __warps__getOffset(ele);

    __warps__setAttribute(ele, 'data-top', offset.top);
    __warps__setAttribute(ele, 'data-left', offset.left);

    if (window.getComputedStyle) {
        var style = window.getComputedStyle(ele, null);
        __warps__setAttribute(ele, 'data-top', style.getPropertyValue("top"));
        __warps__setAttribute(ele, 'data-left', style.getPropertyValue("left"));
        __warps__setAttribute(ele, 'data-width', style.getPropertyValue("width"));
        __warps__setAttribute(ele, 'data-height', style.getPropertyValue("height"));
    }
    else {
        __warps__setAttribute(ele, 'data-client-height', ele.clientHeight);
        __warps__setAttribute(ele, 'data-client-width', ele.clientWidth);

        __warps__setAttribute(ele, 'data-offset-height', ele.offsetHeight);
        __warps__setAttribute(ele, 'data-offset-width', ele.offsetWidth);
        __warps__setAttribute(ele, 'data-offset-left', ele.offsetLeft);
        __warps__setAttribute(ele, 'data-offset-top', ele.offsetTop);

        __warps__setAttribute(ele, 'data-scroll-height', ele.scrollHeight);
        __warps__setAttribute(ele, 'data-scroll-width', ele.scrollWidth);
        __warps__setAttribute(ele, 'data-scroll-left', ele.scrollLeft);
        __warps__setAttribute(ele, 'data-scroll-top', ele.scrollTop);
    }

    __warps__setAttribute(ele, 'data-visualized', 1);
}

/**
 * Visual information. To minimize the document size,
 * we write only the values according to the given schema.
 * 
 * For example : 
 * <div class="product" vi="236 470 980 30">...</div>
 * */
function __warps__getVisionInfo(ele, schema) {
	var vision = "";

	var style = window.getComputedStyle(ele, null);
	var offset = __warps__getOffset(ele);

	var allZero = true;
	for (var i = 0; i < schema.length; ++i) {
		if (i > 0) {
			vision += " ";
		}

		var key = schema[i];
		var value = "";

		if (key == "top") {
			value = offset.top;
		}
		else if (key == "left") {
			value = offset.left;
		}
		else {
			value = style.getPropertyValue(key);
			value = value.replace("px", "");
		}

		if (!isNaN(parseInt(value)) && value != 0) {
			allZero = false;
		}

		vision += value;
	}

	return allZero ? false : vision;
}

/**
 * Compute visualization information
 * @deprecated, use WarpsElementTraversor/WarpsElementVisitor instead
 * */
function __warps__visualize(ele, schema) {
	if (["BODY", "DIV", "A", "IMG", "TABLE", "UL", "DL", "H1", "H2"].indexOf(ele.tagName) != -1) {
		var vision = __warps__getVisionInfo(ele, schema);
		if (vision) {
			ele.setAttribute('vi', vision);
		}
	}

    for(var i = 0; i < ele.childNodes.length; i++) {
    	__warps__visualize(ele.childNodes[i], schema);
    }
}
