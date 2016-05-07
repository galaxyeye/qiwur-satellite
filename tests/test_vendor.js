require(fs.absolute("bootstrap"));

var md5 = vendor("md5");
var sutils = vendor("warpspeed", "satellite", "sutils");

casper.test.begin('test merged md5', 1, function suite(test) {
    test.assertEquals(md5.hex_md5("abcdefghijklmnopqrstuvwxyz"), "c3fcd3d76192e4007dfb496cca67e13b");

    test.done();
});

casper.test.begin('test hashString2Int', 1, function suite(test) {
    var fileNumber = sutils.hashString2Int("http://tuan.qunar.com/deal/QNRNjA4MTMxODQ=?in_track=tuan_list_hotel&bi_city=beijing_city&bi_group_track=5~30~0~A~0~3~~~~~~~~~2~beijing_city~~3~beijing_city");
    var expected = -37038282769;

    test.assertEquals(fileNumber, expected);

    test.done();
});
