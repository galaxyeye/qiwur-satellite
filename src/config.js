var config = {
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

	loadCasper : function() {
		phantom.casperPath = this.loadConfig().casperjs.home;
		phantom.injectJs(phantom.casperPath + '/bin/bootstrap.js');
	}
}

if (config.loadConfig().casperjs.autoLoad) {
	config.loadCasper();
}

for (var f in config) {
	exports[f] = config[f];
}
