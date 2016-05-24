/**
 * This test shows the basic behavior of the standard js object
 * */
casper.test.begin('string basic', 7, function suite(test) {
    "use strict";

    test.assertEquals(new Object(), {});
    test.assertEquals(new Object(null), {});
    test.assertEquals(new Object(undefined), {});
    test.assertTrue(new Boolean(true).valueOf());
    test.assertFalse(new Boolean(false).valueOf());
    test.assertFalse(new Object(false).valueOf());
    test.assertEquals("".length, 0);

    test.done();
});
