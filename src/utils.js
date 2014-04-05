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
	/**
	 * Wait until the test condition is true or a timeout occurs. Useful for waiting
	 * on a server response or for a ui change (fadeIn, etc.) to occur.
	 * 
	 * @param testFx
	 *            javascript condition that evaluates to a boolean, it can be passed
	 *            in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or as
	 *            a callback function.
	 * @param onReady
	 *            what to do when testFx condition is fulfilled, it can be passed in
	 *            as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or as a
	 *            callback function.
	 * @param timeOutMillis
	 *            the max amount of time to wait. If not specified, 3 sec is used.
	 */

	waitFor: function(testFx, onReady, timeOutMillis) {
	    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, // < Default Max Timout is 3s
	        start = new Date().getTime(),
	        condition = false,
	        result = 'success',
	        interval = setInterval(function() {
	            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
	                // If not time-out yet and condition not yet fulfilled
	                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx())
	            } else {
	                if(!condition) {
	                    // If condition still not fulfilled (timeout but condition
						// is 'false')
	                    // console.log("'waitFor()' timeout");
	                    clearInterval(interval); // < Stop this interval

	                    result = 'timeout';
	                } else {
	                    // Condition fulfilled (timeout and/or condition is 'true')
	                    // console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
	                    typeof(onReady) === "string" ? eval(onReady) : onReady();
	                    clearInterval(interval); // < Stop this interval
	                }
	            }
	        }, 250); // < repeat check every 250ms

	    return result;
	},

	processArgs: function (config, contract) {
	    var a = 0;
	    var ok = true;
	    contract.forEach(function(argument) {
	        if (a < phantom.args.length) {
	            config[argument.name] = phantom.args[a];
	        } else {
	            if (argument.req) {
	                console.log('"' + argument.name + '" argument is required. This ' + argument.desc + '.');
	                ok = false;
	            } else {
	                config[argument.name] = argument.def;
	            }
	        }

	        if (argument.oneof && argument.oneof.indexOf(config[argument.name]) == -1) {
	            console.log('"' + argument.name + '" argument must be one of: ' + argument.oneof.join(', '));
	            ok = false;
	        }

	        a++;
	    });

	    return ok;
	},

	mergeConfig: function (config, configFile) {
		var fs = require('fs');
		
	    if (!fs.exists(configFile)) {
	       configFile = "config.json";
	    }

	    var result = JSON.parse(fs.read(configFile));
	    var key = null;
	    for (key in config) {
	    	if (!result[key]) {
	    		result[key] = config[key];
	    	}
	    }

	    return result;
	},

    emitConfig: function (config, prefix) {
        console.log(prefix + 'Config:');
        for (key in config) {
           if (config[key].constructor === Object) {
                if (key === config.task) {
                    console.log(prefix + ' ' + key + ':');
                    for (key2 in config[key]) {
                        console.log(prefix + '  ' + key2 + ': ' + config[key][key2]);
                    }
                }
           } else {
               console.log(prefix + ' ' + key + ': ' + config[key]);
           }
       }
    },

    getFinalUrl: function (page) {
        return page.evaluate(function () {
            return document.location.toString();
        });
    },


    /**********************************************************/
    // directories
    /**********************************************************/
    getOutputDir: function() {
    	return fs.workingDirectory + fs.separator + "output";
    },

    getFetcherLockDir: function() {
    	return this.getOutputDir() + fs.separator + "f";
    },

    getFetcherLockFile: function() {
    	return this.getFetcherLockDir() + fs.separator + system.pid + ".pid";
    },

    getRunnigFetcherNumber: function() {
		files = fs.list(this.getFetcherLockDir());
		return files.length - 2;
    },


    // spider directory
    getSpiderLockDir: function() {
    	return this.getOutputDir() + fs.separator + "s";
    },

    getSpiderLockFile: function() {
    	return this.getSpiderLockDir() + fs.separator + system.pid + ".pid";
    },

    getRunningSpiderNumber: function() {
		files = fs.list(this.getSpiderLockDir());
		return files.length - 2;
    },

    

	// get the web server's document root
	// the remote access must be inside this directory
	docRoot: function() {
		return this.getOutputDir() + fs.separator + "wwwroot";
	},

	// get the absolute path for a relative path
	absolute: function(relativePath) {
		if (relativePath.indexOf(this.docRoot()) == 0) {
			return relativePath;
		}

		var separator = "";
		if (relativePath.indexOf(fs.separator) != 0) {
			separator = fs.separator;
		}

		return this.docRoot() + separator + relativePath;
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
		virtualPath = this.normalizeVirtualPath(virtualPath);

		var last = virtualPath.lastIndexOf("/", 0);
		if (last == 0) return "/";

		return virtualPath.substring(0, last);
	},

	virtualPath2LocalPath: function(virtualPath) {
		return this.absolute(virtualPath);
	},

	localPath2VirtualPath: function(localPath) {
		if (localPath.indexOf(this.docRoot()) === 0) {
			localPath = localPath.substr(this.docRoot().length);
		}

		return this.normalizeVirtualPath(localPath);
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

    /**********************************************************/
    // end web server
    /**********************************************************/

	
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
	        return this.pad(padded, length * 2);
	    }
	    return this.repeat(' ', length - padded.length) + padded;
	},

	repeat: function (chr, length) {
	    for (var str = '', l = 0; l < length; l++) {
	        str += chr;
	    }
	    return str;
	}
};

for (var f in functions) {
	exports[f] = functions[f];
}
