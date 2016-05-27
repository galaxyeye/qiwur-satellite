
/**
 * TODO : move all free functions into a class
 * */

/**
 * Get element offset
 * @return [top, left]
 * */
function __qiwur__getOffset(ele) {
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
function __qiwur__setAttribute(ele, key, value) {
    if (value != "0" && value != "0px" && value != "auto") {
        // value.match(/[1-9]d+px/g);
        ele.setAttribute(key, value);
    }
}

/**
 * @Deprecated
 * */
function __qiwur__setVisionInfoFull(ele) {
	var offset = __qiwur__getOffset(ele);

    __qiwur__setAttribute(ele, 'data-top', offset.top);
    __qiwur__setAttribute(ele, 'data-left', offset.left);

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

    __qiwur__setAttribute(ele, 'data-visualized', 1);
}

/**
 * Visual information. To minimize the document size,
 * we write only the values according to the given schema.
 * 
 * For example : 
 * <div class="product" vi="236 470 980 30">...</div>
 * */
function __qiwur__getVisionInfo(ele, schema) {
	var vision = "";

	var style = window.getComputedStyle(ele, null);
	var offset = __qiwur__getOffset(ele);

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

		if (value != 0 && !isNaN(value)) {
			allZero = false;
		}

		vision += value;
	}

	return allZero ? false : vision;
}

/**
 * Compute descendents number
 * */
function __qiwur__getDescendentsNumber(ele) {
	//
	for(var i = 0; i < ele.childNodes.length; i++) {
		__qiwur__visualize(ele.childNodes[i], schema);
	}
}

var nodeWorker = function(visitor) {
	function walk(ele) {
		visitor.head(ele);
		visitor.visit(ele);
		visitor.tail(ele);
	}
};

/**
 * Compute visualization information
 * */
function __qiwur__visualize(ele, schema) {
	if (["BODY", "DIV", "A", "IMG", "TABLE", "UL", "DL", "H1", "H2"].indexOf(ele.tagName) != -1) {
		var vision = __qiwur__getVisionInfo(ele, schema);
		if (vision) {
			ele.setAttribute('vi', vision);
		}
	}

    for(var i = 0; i < ele.childNodes.length; i++) {
    	__qiwur__visualize(ele.childNodes[i], schema);
    }
}

/**
 * Compute visualization information
 * */
function __qiwur__visualize2(ele, schema) {
	new ElementTraversor(new ElementVisitor()).traverse(ele);
}
