/**
 * Entity crawler module
 * */
"use strict";

var require = patchRequire(require);
var fs = require('fs');
var utils = require('utils');

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
    if (!configFile) {
        configFile = "config/config.json";
    }

    if (!fs.exists(configFile)) {
        logger.error("Failed to load config file : " + configFile);
        phantom.exit(0);
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

Configure.prototype.__findSite = function(name, sites) {
    for (var i = 0; i < sites.length; ++i) {
        if (sites[i].name == name) {
            return sites[i];
        }
    }
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
Configure.prototype.buildObject = function(properties) {
    var obj = {};

    for (var propName in properties) {
        var sequence = 0;
        __recusiveBuildObjectProperty(obj, propName, properties[propName], sequence);
    }

    return obj;
};

/**
 * @param obj {object|array}
 * @param propName {string} dot separated property name
 * @param propValue {object}
 * @return {object|null}
 * */
function __recusiveBuildObjectProperty(obj, propName, propValue, sequence) {
    ++sequence;

    var splitPropNames = propName.split(".").reverse();

    var name = splitPropNames.pop();

    if (obj[name] && !utils.isObject(obj[name]) && splitPropNames.length > 0) {
        console.log("Warning : build config object, property override by {" + name + " : " + obj[name] + "}");
    }

    if (obj[name] === undefined) {
        obj[name] = {};
    }

    // TODO : fix array problem
    // if (utils.isArray(propValue)) {
    //     var arr = [];
    //     for (var i = 0; i < propValue.length; ++i) {
    //         if (utils.isObject(propValue[i])) {
    //             arr[i] = {};
    //             var properties = propValue[i];
    //
    //             for (var propName2 in properties) {
    //                 __recusiveBuildObjectProperty(arr[i], propName2, properties[propName2], sequence);
    //             }
    //         }
    //         else {
    //             arr[i] = propValue[i];
    //         }
    //     }
    //     obj[name] = arr;
    // }

    if (splitPropNames.length == 0) {
        obj[name] = propValue;
    }
    else {
        splitPropNames = splitPropNames.reverse();
        __recusiveBuildObjectProperty(obj[name], splitPropNames.join("."), propValue, sequence);
    }

    return obj;
}
