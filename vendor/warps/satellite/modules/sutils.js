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

var utils_functions = {
    /**********************************************************/
    // directories
    /**********************************************************/
    getOutputDir : function() {
    	return fs.workingDirectory + fs.separator + "tmp" + fs.separator + "output";
    },

    // @Deprecated
    getSysDir : function() {
    	return this.getOutputDir() + fs.separator + "sys";
    },

    // @Deprecated
    getProxyProcessInfoFile : function() {
    	return this.getSysDir() + fs.separator + "proxy-processes.json";
    },

	// get the web server's document root
	// the remote access must be inside this directory
	docRoot: function() {
		return fs.workingDirectory + fs.separator + "wwwroot";
	},

	logDir: function() {
		return fs.workingDirectory + fs.separator + "tmp" + fs.separator + "logs";
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

	getTemporaryFile: function(url) {
		var file = md5.hex_md5(url);
		return this.getOutputDir() + fs.separator + new Date().getDate() + fs.separator + file + ".html";
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
    // @Deprecated	
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
	hashString2Int : function(str) {
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

    /**********************************************************/
    // IPC
    /**********************************************************/
    // @Deprecated	
    loadProxyProcessInfo : function() {
    	return JSON.parse(fs.read(this.getProxyProcessInfoFile()));
    },

    // @Deprecated
    saveProxyProcessInfo : function(info) {
    	fs.write(this.getProxyProcessInfoFile(), info, 'w');
    },

    /**********************************************************/
    // end IPC
    /**********************************************************/

    getFinalUrl: function (page) {
        return page.evaluate(function () {
            return document.location.toString();
        });
    },

    getUrl : function (host, port, path) {
    	if (port == 0 || port == 80) {
            return "http://" + host + path;
    	}

        return "http://" + host + ":" + port + path;
    },

   // @Deprecated
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

/**
 * Extends standard Date object, add format functionality
 * */
Date.prototype.pattern=function(fmt) {
	var o = {
		"M+" : this.getMonth()+1, //月份         
		"d+" : this.getDate(), //日         
		"h+" : this.getHours()%12 == 0 ? 12 : this.getHours()%12, //小时         
		"H+" : this.getHours(), //小时         
		"m+" : this.getMinutes(), //分         
		"s+" : this.getSeconds(), //秒         
		"q+" : Math.floor((this.getMonth()+3)/3), //季度         
		"S" : this.getMilliseconds() //毫秒         
	};
	var week = {
		"0" : "/u65e5",
		"1" : "/u4e00",
		"2" : "/u4e8c",
		"3" : "/u4e09",
		"4" : "/u56db",
		"5" : "/u4e94",
		"6" : "/u516d"
	};
	if(/(y+)/.test(fmt)){
		fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
	}
	if(/(E+)/.test(fmt)){
		fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "/u661f/u671f" : "/u5468") : "")+week[this.getDay()+""]);
	}
	for(var k in o){
		if(new RegExp("("+ k +")").test(fmt)){
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
		}
	}
	return fmt;
};

for (var f in utils_functions) {
	exports[f] = utils_functions[f];
}
