var md5 = vendor('md5');

casper.test.begin('test merged md5', 1, function suite(test) {
    test.assertEquals(md5.hex_md5("abcdefghijklmnopqrstuvwxyz"), "c3fcd3d76192e4007dfb496cca67e13b");

    test.done();
});
