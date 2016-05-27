"use strict";

/**
 * This test shows the basic behavior of the standard js string
 * */
casper.test.begin('array basic', 2, function suite(test) {

    var fruits = ["Apple", "Banana", "Orange", "tomatoes", "Grapes"];

    test.assertTrue(fruits.indexOf("Orange") !== -1);
    test.assertEquals("".length, 0);

    test.done();
});
