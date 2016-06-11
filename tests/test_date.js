/**
 * This test shows the basic behavior of the standard js string
 * */

"use strict";

casper.test.begin('date basics', 1, function suite(test) {

    test.assertEquals(" ".charCodeAt(0), 32);

    var d = new Date();
    console.log((1 + d.getMonth()) + "_" + d.getDate());

    test.done();
});
