"use strict";

var CasperEvents = function CasperEvents() {
    /*jshint maxstatements:40*/
    // init & checks
    if (!(this instanceof CasperEvents)) {
        "use strict";
        return new CasperEvents();
    }
};

CasperEvents.prototype.registerTo = function(casper) {
    /*******************************************************************************
     * network events
     ******************************************************************************/
    casper.on('resource.requested', function(requestData, networkRequest) {
        // this.log("resource.requested : " + requestData.url);

        if (requestData.url.match(/(.+)\.js/i)) {
            // this.log("resource.requested : " + requestData.url, "info");
        }

        if (requestData.url.indexOf("im-x") > 0) {
            networkRequest.abort();
        }
    });

    casper.on('resource.received', function(response) {
//        this.log("received : " + response.url);

        if (response.stage == 'end') {
            if (response.url.match(/(.+)\.js/i)) {
                // this.log("resource.received : " + response.url);
            }

            if (response.url.match(/(.+)commentsList(.+)\.js/i)) {
                // this.log(JSON.stringify(response.headers));
                // this.log(response.contentType);
            }
        }

        if (response.url.indexOf("extract") !== -1) {
            // utils.dump(response);
        }
    });

    casper.on('resource.error', function(resourceError) {
        this.log("resource.error : " + resourceError.errorString);
    });

    casper.on("http.status.404", function(resource) {
        this.log(resource.url + " is not found", "COMMENT");
    });

    casper.on('url.changed', function(targetUrl) {
        this.log('New URL: ' + targetUrl);
    });

    casper.on('complete.error', function(err) {
        this.log("Complete callback has failed: " + err);
    });

    casper.on('capture.saved', function(targetFile) {
        // this.log("Capture saved : " + targetFile);
    });

    casper.on('click', function(selector) {
        this.log("Element clicked, selector : " + selector);
    });

    casper.on('die', function(message, status) {
        // this.die("Die : " + message + ", status : " + status);
    });

    casper.on('error', function(message, backtrace) {
        this.log("Error : " + message + ", backtrace : " + backtrace);
    });

    casper.on('exit', function(status) {
        this.log("Exit : " + status);
    });

    casper.on('fill', function(selector, vals, submit) {
        this.log("Form is filled : " + selector + ", " + vals + ", " + submit);
    });

    casper.on('load.started', function() {
        this.log("Load started");
    });

    casper.on('load.failed', function() {
        this.log("load.failed");
    });

    casper.on('load.finished', function() {
        this.log("load.finished");
    });

    casper.on('step.timeout', function() {
        this.log("step.timeout");
    });

    casper.on('timeout', function() {
        this.log("timeout");
    });
};

window.CasperEvents = CasperEvents;
