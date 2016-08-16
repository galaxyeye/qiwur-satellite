"use strict";

/**
 * Weibo page extractor
 * */
var WeiboExtractor = function WeiboExtractor() {
};

/**
 * Extract fields from an element using the given rule
 *
 * @param feedElement {HTMLElement|null} Element to search child elements within,
 *  default scope is window.document
 * @return Object
 * */
WeiboExtractor.prototype.extract = function(feedElement) {
    var feed = this.extractFeed(feedElement);

    return feed;
};

/**
 * @param feedElement {HTMLElement|null}
 * @return Object
 * */
WeiboExtractor.prototype.extractFeed = function (feedElement) {
    "use strict";

    var v;

    v = __utils__.findOne('.WB_detail > .WB_info', feedElement);
    var author = __qiwur_getMergedTextContent(v);

    v = __utils__.findOne('.WB_from a[href*="weibotime"]', feedElement);
    var time = __qiwur_getMergedTextContent(v);

    v = __utils__.findOne('.WB_from a[action-type*="app_source"]', feedElement);
    var app = __qiwur_getMergedTextContent(v);

    v = __utils__.findOne('div[node-type*="feed_list_content"]', feedElement);
    var content = __qiwur_getMergedTextContent(v);

    var feedExpand = this.extractExpandFeed(feedElement);

    return {author : author, time : time, app : app, content : content, feedExpand : feedExpand};
};

/**
 * @param feedElement {HTMLElement|null}
 * @return Object
 * */
WeiboExtractor.prototype.extractExpandFeed = function (feedElement) {
    "use strict";

    var v = __utils__.findOne('.WB_feed_expand', feedElement);
    var feedExpand = __qiwur_getMergedTextContent(v);

    return {content : feedExpand};
};

/**
 * @param feed {Object}
 * @return String
 * */
WeiboExtractor.prototype.formatFeed = function (feed) {
    "use strict";

    var feedString = "";
    feedString += "author : " + feed.author + "\n";
    feedString += "time : " + feed.time + "\n";

    if (feed.app) {
        feedString += "app : " + feed.app + "\n";
    }
    
    feedString += "content : " + feed.content + "\n";

    if (feed.feedExpand.content) {
        feedString += "feedExpand : " + feed.feedExpand.content + "\n";
    }

    return feedString;
};
