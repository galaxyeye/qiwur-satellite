/**
 * should require(fs.absolute("bootstrap")) in every file
 * */

if (phantom.satelliteInitialized) {
    return;
}

phantom.satelliteInitialized = true;
phantom.vendorPath = fs.workingDirectory + fs.separator + "vendor";

// vendor
(function (global, phantom, fs) {
	var requireVendor = function(require) {
		function getCurrentScriptRoot() {
			if ((phantom.vendorPath || "").indexOf(fs.workingDirectory) === 0) {
				return phantom.vendorPath;
			}
			return fs.absolute(fs.pathJoin(fs.workingDirectory, phantom.vendorPath));
		}
		function resolveFile(path, dir) {
			var extensions = ['js', 'json'];
			var basenames = [path, path + '/index'];
			var paths = [];
			basenames.forEach(function(basename) {
				paths.push(fs.absolute(fs.pathJoin(dir, basename)));
				extensions.forEach(function(extension) {
					paths.push(fs.absolute(fs.pathJoin(dir, [basename, extension].join('.'))));
				});
			});
			for (var i = 0; i < paths.length; i++) {
				if (fs.isFile(paths[i])) {
					return paths[i];
				}
			}
			return null;
		}
		function vendorModulePath(vendor, project, name) {
			var resolved, prevBaseDir;
			var baseDir = getCurrentScriptRoot() + fs.separator +　vendor + fs.separator + project;
			do {
				resolved = resolveFile(name, fs.pathJoin(baseDir, 'modules'));
				prevBaseDir = baseDir;
				baseDir = fs.absolute(fs.pathJoin(prevBaseDir, '..'));
			} while (!resolved && baseDir !== '/' && prevBaseDir !== '/' && baseDir !== prevBaseDir);
			return resolved;
		}
		var requiredVendor = function requiredVendor() {
			try {
				var vendor, project, name;
				if (arguments.length >= 3) {
					vendor = arguments[0];
					project = arguments[1];
					name = arguments[2];
				}
				else if (arguments.length == 2) {
					vendor = 'warpspeed';
					project = arguments[0];
					name = arguments[1];
				}
				else if (arguments.length == 1) {
					vendor = 'warpspeed';
					project = 'satellite';
					name = arguments[0];
				}
				else {
					throw new CasperError("Invalid arguments");
				}

				return require(vendorModulePath(vendor, project, name));
			} catch (e) {
				throw new CasperError("Can't find module " + vendor + project + name);
			}
		};
		return requiredVendor;
	} // requireVendor

	global.vendor = requireVendor(global.require);
})(window, phantom, require('fs'));

var config = {
	/**********************************************************/
	// config
	/**********************************************************/
	loadConfig : function (configFile) {
		if (!fs.exists(configFile)) {
			configFile = "config/config.json";
		}

		// fs uses relative path based on fs.workingDirectory
		var result = JSON.parse(fs.read(configFile));

		return result;
	},

	loadSites : function(configFile) {
		if (!configFile || !fs.exists(configFile)) {
			configFile = "config/sites.json";
		}

		var sites = this.loadConfig(configFile);
		return sites;
	},

	loadSite : function(siteName, configFile) {
		var sites = this.loadSites(configFile);
		var site = this.__findSite(siteName, sites);

		return site;
	},

	loadSiteObject : function(siteName, configFile) {
		var sites = this.loadSites(configFile);
		var site = this.__findSite(siteName, sites);
		return this.buildObject(site);
	},

	mergeConfig: function (config, config2) {
		for (var key in config2) {
			config[key] = config2[key];
		}

		return config;
	},

	/**
	 * Build object from property based configuation, for example :
	 * {
	 * 	   "page.detail.regex" : "http://tuan.ctrip.com/group/(.+)",
	 *     "page.detail.start" : 0,
	 *     "page.detail.limit" : 300,
	 * }
	 * ==== can be build to be ====>
	 * {
	 * 		page : {
	 * 			detail : {
	 * 				regex : "http://tuan.ctrip.com/group/(.+)",
	 * 				start : 0,
	 * 				limit : 300
	 * 			}
	 * 		}
	 * }
	 * */
	buildObject : function(proprties) {
		var obj = {};

		for (propName in proprties) {
			this.__buildObjectProperty(obj, propName, proprties[propName]);
		}

		return obj;
	},

	__findSite : function(name, sites) {
		for (var i = 0; i < sites.length; ++i) {
			if (sites[i].name == name) {
				return sites[i];
			}
		}
	},

	__buildObjectProperty : function(obj, nestedPropNames, propValue) {
		nestedPropNames = nestedPropNames.split(".").reverse();

		this.__recusiveBuildObjectProperty(obj, nestedPropNames, propValue);
	},

	__recusiveBuildObjectProperty : function(obj, nestedPropNames, value) {
		var name = nestedPropNames.pop();

		if (!obj[name]) {
			obj[name] = {};
		}

		if (nestedPropNames.length == 0) {
			obj[name] = value;
			return obj;
		}

		return this.__recusiveBuildObjectProperty(obj[name], nestedPropNames, value);
	}
}

window.config = window.config ? config.mergeConfig(window.config, config) : config;
