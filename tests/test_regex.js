/**
 * This test shows the basic behavior of the standard js regex
 * */
casper.test.begin('js match group', 7, function suite(test) {
	var regex = "http://tuan.ctrip.com/group/(.+)";
	var pattern = new RegExp(regex);
	var str = "http://tuan.ctrip.com/group/2084529.html#ctm_ref=grt_sr_pm_def_b";

    test.assertTrue(pattern.test(str));

    test.assertMatch("#/detail/2108347737", /(.+)detail(.+)/);
    test.assertMatch(" 年份 2003-09-Tu".trim(), /^(年份)(.+)/);

    str = " 年份 2003-09-Tu";
    var groups = str.trim().match(/^(年份)(.+)/);
    test.assertEquals(groups.length, 3);
    test.assertEquals(groups[0], str.trim());
    test.assertEquals(groups[1], "年份");
    test.assertEquals(groups[2], " 2003-09-Tu");

    test.done();
});

casper.test.begin('html relative path 2 absolute path', 1, function suite(test) {
	var subject = '<link href="//img11.360buyimg.com"/><img src="//img11.360buyimg.com/55f796b7N9ebe9fb5.jpg" />';
	var expected = '<link href="http://img11.360buyimg.com"/><img src="http://img11.360buyimg.com/55f796b7N9ebe9fb5.jpg" />';
	subject = subject.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

    test.assertEquals(subject, expected);

    test.done();
});
