"use strict";

var CasperEventRegister = function CasperEventRegister(casper) {
    /*jshint maxstatements:40*/
    // init & checks
    if (!(this instanceof CasperEventRegister)) {
        "use strict";

        return new CasperEventRegister(casper);
    }

    this.test = function () {
        "use strict";

        console.log("hello");
    };

    /*******************************************************************************
     * network events
     ******************************************************************************/
    casper.on('resource.requested', function(requestData, networkRequest) {
    });

    casper.on('resource.received', function(response) {
//        this.echo("received : " + response.url);

        // check response status

        if (response.url.indexOf("extract") !== -1) {
            // utils.dump(response);
        }
    });

    casper.on('resource.error', function(resourceError) {
        this.echo("resource.error : " + resourceError.errorString);
    });

    casper.on("http.status.404", function(resource) {
        this.echo(resource.url + " is not found", "COMMENT");
    });

    casper.on('url.changed', function(targetUrl) {
        this.echo('New URL: ' + targetUrl);
    });

    casper.on('complete.error', function(err) {
        this.echo("Complete callback has failed: " + err);
    });

    casper.on('capture.saved', function(targetFile) {
        this.echo("Capture saved : " + targetFile);
    });

    casper.on('click', function(selector) {
        this.echo("Element clicked, selector : " + selector);
    });

    casper.on('die', function(message, status) {
        this.die("Die : " + message + ", status : " + status);
    });

    casper.on('error', function(message, backtrace) {
        this.echo("Error : " + message + ", backtrace : " + backtrace);
    });

    casper.on('exit', function(status) {
        this.echo("Exit : " + status);
    });

    casper.on('fill', function(selector, vals, submit) {
        this.echo("Form is filled : " + selector + ", " + vals + ", " + submit);
    });

    casper.on('load.started', function() {
        this.echo("Load started");
    });

    casper.on('load.failed', function() {
        this.echo("load.failed");
    });

    casper.on('load.finished', function() {
        this.echo("load.finished");
    });

    casper.on('step.timeout', function() {
        this.echo("step.timeout");
    });

    casper.on('timeout', function() {
        this.echo("timeout");
    });
};

window.CasperEventRegister = CasperEventRegister;
