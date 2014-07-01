$(document).ready(function() {
	function simulateMouseOver(document, ele) {
        if( document.createEvent ) {
            var event = document.createEvent('MouseEvents');
            event.initEvent('mouseover', true, false);
            ele.dispatchEvent(event);
        } else if (document.createEventObject) {
        	ele.fireEvent('onmouseover');
        }
    }

	function getRelativeUri(uri) {
		var pos = uri.indexOf("http://");
		if (pos !== -1) uri = uri.substring("http://".length);
		pos = uri.indexOf("https://");
		if (pos !== -1) uri = uri.substring("https://".length);
		pos = uri.indexOf("/", 0);
		if (pos !== -1) uri = uri.substring(pos);

		return uri;
	}

	function onScrappingFrameClick(element) {
		$(element).parent().get(0).setAttribute('class', 'scraping-highlight-block');
	}

	function onTagClick(element) {
		$.get(element.href, function(data) {
			var nodes = $.parseHTML(data, null);
			$.each(nodes, function(i, node) {
				if (node.id == "QiwurScrapingMetaInformation") {
					$.data(document.body, "metaNode", node);
				}
			});
			var domain = $.data(document.body, "metaNode").getAttribute("data-domain");

			var tidyNodes = [];
			while (nodes.length > 0) {
				var node = nodes.pop();
				if (domain != null) {
					if (node.tagName && node.tagName.toLowerCase() == 'link') {
						if (node.type && node.type.toLowerCase() == 'text/css') {
							var href = node.getAttribute('href');
							if (href.indexOf("http://") !== 0) {
								node.setAttribute('href', "http://" + domain + getRelativeUri(href));
							}

							tidyNodes.push(node);
						}
					}
				}

				if (node.tagName && node.tagName.toLowerCase() == 'div') {
					tidyNodes.push(node);
				}
			}

			if (tidyNodes != null && domain != null) {
				$.each(tidyNodes, function(i, node) {
					$(node).find("a").each(function(j, a) {
						if (a.href.indexOf("http://") !== 0) {
							a.href = "http://" + domain + getRelativeUri(a.href);
						}
						a.target = '_blank';
					});

					$(node).find("img").each(function(j, img) {
						if (img.src.indexOf("http://") !== 0) {
							img.src = "http://" + domain + getRelativeUri(img.src);
						}
					});
				});
			}

			tidyNodes.reverse();
			$('.scrapping.frame.wrap').append(tidyNodes);

			$('.scrapping.frame.wrap div').click(function() {
				onScrappingFrameClick(this);
			});
		});
	}

	$('.command li a').click(function() {
		if (this.href.indexOf('/tag') !== -1) {
			onTagClick(this);
		} // tag
		else {
			$('.message').load(this.href);
		}
		return false;
	});
});
