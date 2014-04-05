(function(host) {

	function Crawler() {
		this.visitedURLs = {};
	}

	Crawler.webpage = require('webpage');

	Crawler.prototype.crawl = function(url, depth, onSuccess, onFailure) {
		if (0 == depth || this.visitedURLs[url]) {
			return;
		}

		var self = this;
		var page = Crawler.webpage.create();
		page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36';

		page.open(url, function(status) {
			if ('fail' === status) {
				onFailure({
					url : url,
					status : status
				});
			} else {
				var documentHTML = page.evaluate(function() {
					return document.body && document.body.outerHTML ? document.body.outerHTML : "";
				});

				self.crawlURLs(self.getAllURLs(page), depth - 1, onSuccess, onFailure);
				self.visitedURLs[url] = true;

				onSuccess({
					url : url,
					status : status,
					content : documentHTML
				});
			}
		});
	};

	Crawler.prototype.getAllURLs = function(page) {
		return page.evaluate(function() {
			return Array.prototype.slice.call(document.querySelectorAll("a"), 0).map(
				function(link) {
					return link.getAttribute("href");
				});
		});
	};

	Crawler.prototype.crawlURLs = function(urls, depth, onSuccess, onFailure) {
		var self = this;

		urls.filter(function(url) {
			return Crawler.isTargetResource(url);
		}).forEach(function(url) {
			self.crawl(url, depth, onSuccess, onFailure);
		});
	};

	Crawler.isTargetResource = function(url) {
		return Crawler.isIndexPage(url) || Crawler.isDetailPage(url) || Crawler.isJS(url);
	};

	Crawler.isIndexPage = function(url) {
		return (/.+searchex\..+/gi).test(url);
	};

	Crawler.isDetailPage = function(url) {
		return (/.+item\..+/gi).test(url);
	};

	host.Crawler = Crawler;
})(phantom);

var i = 0;

new phantom.Crawler().crawl(
	"http://item.yixun.com/item-553917.html",
	1,
	function onSuccess(page) {
		var fs = require('fs');

		++i;
		fs.write("output/" + i + ".html", page.content, 'w');

		console.log("Loaded page. URL = " + page.url + " content length = "
				+ page.content.length + " status = " + page.status);
	},

	function onFailure(page) {
		console.log("Could not load page. URL = " + page.url + " status = "
				+ page.status);
	}
);
