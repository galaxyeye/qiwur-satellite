"use strict";

/**
 * This test shows the basic behavior of the standard js Number
 * */
casper.test.begin('number string comparson', 5, function suite(test) {
    test.assertTrue(10 > "2"); // convert string to integer before comparison
    test.assertTrue("10" > 2); // convert string to integer before comparison
    test.assertFalse("10" > "2"); // alphabetic comparison
    
    test.assertFalse("54321" > "6000"); // alphabetic comparison
    test.assertTrue(parseInt("54321") > parseInt("6000"));
    
    test.done();
});

casper.test.begin('number string', 1, function suite(test) {
    test.assertTrue(isNaN(parseInt("a")));

    test.done();
});
