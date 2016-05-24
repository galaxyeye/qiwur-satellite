/**
 * This test shows the basic behavior of the standard js string
 * */
casper.test.begin('string basic', 7, function suite(test) {
    "use strict";

    test.assertFalse(undefined);
    test.assertFalse(null);
    test.assertFalse("");
    test.assertTrue(!"");
    test.assertEquals("".length, 0);

    test.assertEquals(typeof "", "string");
    test.assertEquals(typeof new String(""), "object");

    test.done();
});

casper.test.begin('string primitives VS String objects', 4, function suite(test) {
    "use strict";

    var s1 = "2 + 2";               // creates a string primitive
    var s2 = new String("2 + 2");   // creates a String object
    
    test.assertEquals(typeof s1, "string");
    test.assertEquals(typeof s2, "object");

    test.assertEquals(eval(s1), 4);
    test.assertEquals(eval(s2).toString(), "2 + 2".toString());
    
    test.done();
});
