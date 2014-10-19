var config = require('./../config');
var casper = require("casper").create();
var fs = require("fs");

casper.on('resource.requested', function(requestData, request) {
	this.echo(requestData.url);

	if (requestData.url.indexOf("ClosePage.html") !== -1) {
		request.abort();
	}
});

casper.start("http://hrtest00.many-it.com/qhzjj/Web/index.aspx", function() {
	this.fillSelectors('form[action="index.aspx"]', {
		'input[name = txtLoginName ]' : 'admin',
		'input[name = txtPassword ]' : '11',
	}, false);
}).thenClick("#ibnLogin", function() {
	this.echo("ibnLogin clicked");
});

casper.thenOpen('http://hrtest00.many-it.com/qhzjj/Web/Frame/MainZJJ.aspx', function() {
	this.echo("in MainZJJ.aspx");
});

casper.thenEvaluate(function(term) {
	document.querySelector('#MainPageFileListOnlyGrid1_dgdFile a');
});

casper.waitFor(function check() {
    return this.evaluate(function() {
        return document.querySelectorAll('#MainPageFileListOnlyGrid1_dgdFile').length > 0;
    });
}, function then() {
    this.captureSelector('/tmp/many-it.png', '#MainPageFileListOnlyGrid1_dgdFile');

    fs.write("/tmp/many-it.html", this.getHTML(), 'w');
});

casper.run(function() {
	this.exit();
});
