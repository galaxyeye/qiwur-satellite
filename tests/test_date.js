/**
 * This test shows the basic behavior of the standard js string
 * */

"use strict";

var sutils = vendor('sutils');

casper.test.begin('date basics', 1, function suite(test) {
    var d = new Date();

    var s = ("0" + (1 + d.getMonth())).slice(-2) + "." + ("0" + d.getDate()).slice(-2);
    var s2 = d.pattern("MM.dd");

    console.log(s);
    console.log(s2);

    test.assertEqual(s, s2);
    
    test.done();
});
