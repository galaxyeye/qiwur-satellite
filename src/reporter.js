var fs = require("fs");
var utils = require('./utils');
var fetcher = require('./fetcher');
var logger = require('./logger');

var tasks = {
	sayHello : function() {
		return "hello";
	}
};

var reporter = {
	argumentConfig : [
		{
			name : 'reportUrl',
			def : 'http://qiwur.com',
			req : false,
			desc : 'the target url to fetch if this program runs in standalone mode'
		},
	],

    config: false,

    run: function () {
    	this.config = utils.buildConfig(this.argumentConfig).reporter;

    	url = this.config.url;
    	// and what?
    	var page = new WebPage();
    	page.open(url, function (status) {
    	    if (status !== 'success') {
    	        console.log('FAIL to load the address');
    	    } else {
    	        console.log('satellite status reported');
    	    }

    	    phantom.exit();
    	});
    },
};

reporter.run();
