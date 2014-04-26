var fs = require("fs");
var system = require("system");

var md5 = require("./md5");

var Salt = null;

if (Salt == null) {
	Salt = new Date().getDate();
	var env = system.env;
	Object.keys(env).forEach(function(key) {
		Salt += env[key];
	});
	Salt = md5.hex_md5(Salt);
}

var functions = {
    /**********************************************************/
    // config
    /**********************************************************/
	loadConfig : function (configFile) {
		var fs = require('fs');

	    if (!fs.exists(configFile)) {
	       configFile = "conf/config.json";
	    }

	    var result = JSON.parse(fs.read(configFile));

	    return result;
	},

	mergeConfig: function (config, config2) {
	    for (var key in config2) {
    		config[key] = config2[key];
	    }

	    return config;
	},

    /**********************************************************/
    // directories
    /**********************************************************/
    getOutputDir: function() {
    	return fs.workingDirectory + fs.separator + "output";
    },

    getFetcherLockDir: function() {
    	return utils.getOutputDir() + fs.separator + "f";
    },

    getFetcherLockFile: function() {
    	return utils.getFetcherLockDir() + fs.separator + system.pid + ".pid";
    },

    getRunnigFetcherNumber: function() {
		files = fs.list(utils.getFetcherLockDir());
		return files.length - 2;
    },


    // spider directory
    getSpiderLockDir: function() {
    	return utils.getOutputDir() + fs.separator + "s";
    },

    getSpiderLockFile: function() {
    	return utils.getSpiderLockDir() + fs.separator + system.pid + ".pid";
    },

    getRunningSpiderNumber: function() {
		files = fs.list(utils.getSpiderLockDir());
		return files.length - 2;
    },

	// get the web server's document root
	// the remote access must be inside this directory
	docRoot: function() {
		return utils.getOutputDir() + fs.separator + "wwwroot";
	},

	logDir: function() {
		return utils.getOutputDir() + fs.separator + "logs";
	},

	// get the absolute path for a relative path
	absolute: function(relativePath) {
		if (relativePath.indexOf(utils.docRoot()) == 0) {
			return relativePath;
		}

		var separator = "";
		if (relativePath.indexOf(fs.separator) != 0) {
			separator = fs.separator;
		}

		return utils.docRoot() + separator + relativePath;
	},

	getTemporaryFile: function(url) {
		var file = md5.hex_md5(url);
		return utils.docRoot() + fs.separator + new Date().getDate() + fs.separator + file + ".html";
	},

	normalizeVirtualPath: function(virtualPath) {
		if (virtualPath.indexOf("/") != 0) {
			virtualPath = "/" + virtualPath;
		}

		if (virtualPath.indexOf("//") == 0) {
			virtualPath = virtualPath.substr(1);
		}

		if (virtualPath.length > 2 && virtualPath.indexOf("/") == virtualPath.length - 1) {
			virtualPath = virtualPath.substr(0, virtualPath.length - 1);
		}

		return virtualPath;
	},

	parentVirtualPath: function(virtualPath) {
		virtualPath = utils.normalizeVirtualPath(virtualPath);

		var last = virtualPath.lastIndexOf("/", 0);
		if (last == 0) return "/";

		return virtualPath.substring(0, last);
	},

	virtualPath2LocalPath: function(virtualPath) {
		return utils.absolute(virtualPath);
	},

	localPath2VirtualPath: function(localPath) {
		if (localPath.indexOf(utils.docRoot()) === 0) {
			localPath = localPath.substr(utils.docRoot().length);
		}

		return utils.normalizeVirtualPath(localPath);
	},
    /**********************************************************/
	// end directories
    /**********************************************************/


    /**********************************************************/
    // web server
    /**********************************************************/
	getSafeCommand : function(c) {
		return md5.hex_md5(c + md5.hex_md5(Salt + c));
	},


	//decode host and port info from header
	decode_host : function(host) {
		out = {};
		host = host.split(':');
		out.host = host[0];
		out.port = host[1] || 80;
		return out;
	},

	// encode host field
	encode_host : function(host) {
		return host.host + ((host.port == 80) ? "" : ":" + host.port);
	},

	// sdbm algorithm
	hashString2Int: function(str) {
	    var hash = 0;

		if (typeof(str) !== "string" || str.length == 0) return hash;

	    for (var i = 0; i < str.length; i++) {
	        var char = str.charCodeAt(i);
	        hash = char + (hash << 6) + (hash << 16) - hash;
	    }

		return hash;
	},

	// magic numbers in this function : 
	// 97 === 'a'.charCodeAt(0);
	// 122 === 'z'.charCodeAt(0);
	// 27777778775 === hash("zzzzzzzzzz")
	// 20000 : 将端口号限制在[10000, 30000]之间，系统最大端口号一般是65535(2^16-1)，也就是unsigned short的最大值
	portGenerator : function(serviceName) {
		if (typeof(serviceName) !== "string" || serviceName.length == 0) return hash;

		var hash = 0;

		if (serviceName.length > 10) {
			serviceName = serviceName.substr(0, 10);
		}

		serviceName = serviceName.toLowerCase();
	    for (var i = 0; i < serviceName.length; i++) {
	        var char = serviceName.charCodeAt(i);
	        if (char < 97 || char > 122) continue;

	        char = char - 97;

	        hash += char * Math.pow(10, i);
	    }

	    hash = Math.round(10000 + hash / 27777778775.0 * 20000);

		return hash;
	},

    /**********************************************************/
    // end web server
    /**********************************************************/

    getFinalUrl: function (page) {
        return page.evaluate(function () {
            return document.location.toString();
        });
    },

    getResourceUrls: function (page) {
        return page.evaluate(function () {
            var
                // resources referenced in DOM
                // notable exceptions: iframes, rss, links
                selectors = [
                    ['script', 'src'],
                    ['img', 'src'],
                    ['link[rel="stylesheet"]', 'href']
                ],

                resources = {},
                baseScheme = document.location.toString().split("//")[0],
                tallyResource = function (url) {
                    if (url && url.substr(0,5)!='data:') {
                        if (url.substr(0, 2)=='//') {
                            url = baseScheme + url;
                        }
                        if (!resources[url]) {
                            resources[url] = 0;
                        }
                        resources[url]++;
                    }
                },

                elements, elementsLength, e,
                stylesheets, stylesheetsLength, ss,
                rules, rulesLength, r,
                style, styleLength, s,
                computed, computedLength, c,
                value;

            // attributes in DOM
            selectors.forEach(function (selectorPair) {
                elements = document.querySelectorAll(selectorPair[0]);
                for (e = 0, elementsLength = elements.length; e < elementsLength; e++) {
                    tallyResource(elements[e].getAttribute(selectorPair[1]));
                };
            });

            // URLs in stylesheets
            stylesheets = document.styleSheets;
            for (ss = 0, stylesheetsLength = stylesheets.length; ss < stylesheetsLength; ss++) {
                rules = stylesheets[ss].rules;
                if (!rules) { continue; }
                for (r = 0, rulesLength = rules.length; r < rulesLength; r++) {
                    if (!rules[r]['style']) { continue; }
                    style = rules[r].style;
                    for (s = 0, styleLength = style.length; s < styleLength; s++) {
                        value = style.getPropertyCSSValue(style[s]);
                        if (value && value.primitiveType == CSSPrimitiveValue.CSS_URI) {
                            tallyResource(value.getStringValue());
                        }
                    }
                };
            };

            // URLs in styles on DOM
            elements = document.querySelectorAll('*');
            for (e = 0, elementsLength = elements.length; e < elementsLength; e++) {
                computed = elements[e].ownerDocument.defaultView.getComputedStyle(elements[e], '');
                for (c = 0, computedLength = computed.length; c < computedLength; c++) {
                    value = computed.getPropertyCSSValue(computed[c]);
                    if (value && value.primitiveType == CSSPrimitiveValue.CSS_URI) {
                        tallyResource(value.getStringValue());
                    }
                }
            };

            return resources;
        });
    },

    getEncoding: function(str) {
    	var encoding = null;

    	var pos = str.indexOf('charset=');
    	if (pos !== -1) {
    		encoding = str.substring(pos + 'charset='.length);
    		encoding = encoding.replace(/[\"|\']/g, "");
    	}

    	return encoding;
    },

    getEncodingFromMeta: function(str) {
    	var encoding = null;

    	var pos = str.indexOf('charset=');
    	if (pos !== -1) {
    		encoding = str.substring(pos + 'charset='.length);
    		encoding = encoding.replace(/[\"|\']/g, "");
    	}

    	return encoding;
    },

	isJS: function(url) {
	    if ((/http:\/\/.+?\.js/gi).test(url)) {
	    	return true;
	    }

		return false;
	},

	truncate: function (str, length) {
	    length = length || 80;
	    if (str.length <= length) {
	        return str;
	    }
	    var half = length / 2;
	    return str.substr(0, half-2) + '...' + str.substr(str.length - half + 1);
	},

	pad: function (str, length) {
	    var padded = str.toString();
	    if (padded.length > length) {
	        return utils.pad(padded, length * 2);
	    }
	    return utils.repeat(' ', length - padded.length) + padded;
	},

	repeat: function (chr, length) {
	    for (var str = '', l = 0; l < length; l++) {
	        str += chr;
	    }
	    return str;
	},

};

for (var f in functions) {
	exports[f] = functions[f];
}
