/**
 * This test shows the basic behavior of the standard js regex
 * */
casper.test.begin('js regex', 3, function suite(test) {
	var regex = "http://tuan.ctrip.com/group/(.+)";
	var pattern = new RegExp(regex);
	var str = "http://tuan.ctrip.com/group/2084529.html#ctm_ref=grt_sr_pm_def_b";

    test.assertTrue(pattern.test(str));

    test.assertMatch("#/detail/2108347737", /(.+)detail(.+)/);
    test.assertMatch("年份 2003-09-Tu", /^(年份)(.+)/);

    test.done();
});

casper.test.begin('html relative path 2 absolute path', 1, function suite(test) {
	var subject = '<link href="//img11.360buyimg.com"/><img src="//img11.360buyimg.com/55f796b7N9ebe9fb5.jpg" />';
	var expected = '<link href="http://img11.360buyimg.com"/><img src="http://img11.360buyimg.com/55f796b7N9ebe9fb5.jpg" />';
	subject = subject.replace(/(href|src)=('|")\/\//gi, "$1=$2http://");

    test.assertEquals(subject, expected);

    test.done();
});
