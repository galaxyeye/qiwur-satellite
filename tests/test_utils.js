require(fs.absolute("bootstrap"));

var sutils = vendor('sutils');
var utils = require('utils');
var fs = require('fs');

casper.test.begin('test hashString2Int', 1, function suite(test) {
    var fileNumber = sutils.hashString2Int("http://tuan.qunar.com/deal/QNRNjA4MTMxODQ=?in_track=tuan_list_hotel&bi_city=beijing_city&bi_group_track=5~30~0~A~0~3~~~~~~~~~2~beijing_city~~3~beijing_city");
    var expected = -37038282769;

    test.assertEquals(fileNumber, expected);

    test.done();
});

casper.test.begin('test merged utils', 1, function suite(test) {
    test.assertTrue(utils.isFunction(sutils.hashString2Int));

    test.done();
});
