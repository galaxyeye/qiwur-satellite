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
        if (requestData.url.length < 10) {
            this.log("Ignore too short url " + requestData.url);
            return;
        }

        // do not load anything from the internet
        // var isUrl = requestData.url.match(/http:|\.com|\.cn|\.net|\.org/i);
        /** Do not load resource from the internet */
        var isInternet = requestData.url.match(/^http/i);
        if (isInternet) {
            networkRequest.abort();
            return;
        }

        /** Do not load resource from the internet */
        if (!fs.exists(requestData.url.substr("file://".length))) {
            this.log("Local file does not exists - " + requestData.url);
            networkRequest.abort();
            return;
        }

        this.log("Resource requested : " + requestData.url);
    });

    casper.on('resource.received', function(response) {
        // TODO : why we issue an empty url?
        if (response.url.length == 0) {
            return;
        }

        this.log("Resource received : " + response.url);
    });

    casper.on('resource.error', function(resourceError) {
        // this.log("resource.error : " + resourceError.errorString);
        // 301 : Unknown protocol
        if (resourceError.errorCode === 301) {
            return;
        }

        this.log("resource.error : " + JSON.stringify(resourceError));
    });

    casper.on("http.status.404", function(resource) {
        this.log(resource.url + " is not found");
    });

    casper.on('url.changed', function(targetUrl) {
        this.log('New URL: ' + targetUrl);
    });

    casper.on('complete.error', function(err) {
        this.log("Complete callback has failed: " + err);
    });

    casper.on('capture.saved', function(targetFile) {
        this.log("Capture saved : " + targetFile);
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
