/**
 * Entity crawler module
 * */
"use strict";

var require = patchRequire(require);
var fs = require('fs');

exports.create = function create() {
    "use strict";
    
    return new Configure();
};

/**
 * Configure
 * */
var Configure = function Configure(options) {
    /*jshint maxstatements:40*/
    // init & checks
    if (!(this instanceof Configure)) {
        return new Configure(options);
    }

    this.configFile = "config/sites.json";
};

Configure.prototype.test = function() {
    console.log("Test");
};

/**********************************************************/
// config
/**********************************************************/
Configure.prototype.loadConfig = function(configFile) {
    if (!fs.exists(configFile)) {
        configFile = "config/config.json";
    }
    
    // fs uses relative path based on fs.workingDirectory
    var result = JSON.parse(fs.read(configFile));
    return result;
};

Configure.prototype.loadSites = function(configFile) {
    if (!configFile || !fs.exists(configFile)) {
        configFile = this.configFile;
    }

    return this.loadConfig(configFile);
};

Configure.prototype.loadSite = function(siteName, configFile) {
    var sites = this.loadSites(configFile);

    var site = this.__findSite(siteName, sites);

    return site;
};

/**
 * Load site configuration as an object
 *
 * @param  siteName The site name to load into an object in config file
 * @param  configFile File name contains the configuration information
 * @return Object
 * @see    config#loadSites
 * */
Configure.prototype.loadSiteObject = function(siteName, configFile) {
    var sites = this.loadSites(configFile);
    var site = this.__findSite(siteName, sites);
    return this.buildObject(site);
};

Configure.prototype.mergeConfig = function(config, config2) {
    for (var key in config2) {
        config[key] = config2[key];
    }

    return config;
};

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
Configure.prototype.buildObject = function(proprties) {
    var obj = {};

    for (var propName in proprties) {
        this.__buildObjectProperty(obj, propName, proprties[propName]);
    }

    return obj;
};

Configure.prototype.__findSite = function(name, sites) {
    for (var i = 0; i < sites.length; ++i) {
        if (sites[i].name == name) {
            return sites[i];
        }
    }
};

Configure.prototype.__buildObjectProperty = function(obj, nestedPropNames, propValue) {
    nestedPropNames = nestedPropNames.split(".").reverse();

    __recusiveBuildObjectProperty(obj, nestedPropNames, propValue);
};

function __recusiveBuildObjectProperty(obj, nestedPropNames, value) {
    var name = nestedPropNames.pop();

    if (!obj[name]) {
        obj[name] = {};
    }

    if (nestedPropNames.length == 0) {
        obj[name] = value;
        return obj;
    }

    return __recusiveBuildObjectProperty(obj[name], nestedPropNames, value);
}
