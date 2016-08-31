"use strict";
var fs = require("fs");
var utils = require("utils");

var tmpDir = "/tmp/warps/satellite/tests";

/**
 * This test shows the basic behavior of the file system
 * */
casper.test.begin('file basic', 2, function suite(test) {
    var persistentFile = tmpDir + "/test_file.txt";
    fs.write(persistentFile, '', 'w');

    var fruits = ["Apple", "Banana", "Orange", "tomatoes", "Grapes"];
    fs.write(persistentFile, fruits.join("\n"), 'a+');
    fruits = ["Babaco", "Blueberry", "Calamansi", "Ceriman"];
    fs.write(persistentFile, fruits.join("\n"), 'a+');

    fruits = fs.read(persistentFile);
    fruits = fruits.split("\n");

    // utils.dump(fruits);
    
    test.assertTrue(fruits.indexOf("Orange") !== -1);
    test.assertTrue(fruits.indexOf("Blueberry") !== -1);

    test.done();
});
