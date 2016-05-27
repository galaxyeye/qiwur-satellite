/**
 * This test shows the basic behavior of the standard js string
 * */

"use strict";

casper.test.begin('string basic', 7, function suite(test) {

    test.assertFalse(undefined);
    test.assertFalse(null);
    test.assertFalse("");
    test.assertTrue(!"");
    test.assertEquals("".length, 0);

    test.assertEquals(typeof "", "string");
    test.assertEquals(typeof new String(""), "object");

    test.done();
});

casper.test.begin('string and characters', 2, function suite(test) {

    test.assertEquals(" ".charCodeAt(0), 32);
    test.assertEquals("\n".charCodeAt(0), 10);

    test.done();
});

casper.test.begin('string primitives VS String objects', 4, function suite(test) {
    var s1 = "2 + 2";               // creates a string primitive
    var s2 = new String("2 + 2");   // creates a String object
    
    test.assertEquals(typeof s1, "string");
    test.assertEquals(typeof s2, "object");

    test.assertEquals(eval(s1), 4);
    test.assertEquals(eval(s2).toString(), "2 + 2".toString());
    
    test.done();
});

casper.test.begin('string split', 4, function suite(test) {

    test.assertEquals("0 0 0 0".split(" ").length, 4);
    test.assertEquals("0, 0, 0, 0".split(", ").length, 4);

    var expected = ["Hello ", "1", " word. Sentence number ", "2", "."];
    test.assertEquals("Hello 1 word. Sentence number 2.".split(/(\d)/), expected);

    test.assertEquals("abcdefghijk".split('').reverse().join(''), "kjihgfedcba");

    test.done();
});

casper.test.begin('string chop', 2, function suite(test) {
    var str = "a\nb\nc\nd\ne\n\rf\n\ng";
    str = str.replace(/\s+/g, " ");

    test.assertEquals(str, "a b c d e f g");
    test.assertEquals("0, 0, 0, 0".split(", "), ["0", "0", "0", "0"]);

    test.done();
});
