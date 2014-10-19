var fs = require("fs");
var utils = require('./utils');

var url = "http://detail.tmall.com/item.htm?spm=a220m.1000858.1000725.1.Hwdc5o&id=25060344207&areaId=310100&cat_id=50099663&rn=ab52bd835fbb26f2842fe67a4d780ce6&user_id=844537169&is_b=1#detail";
var file = utils.getTemporaryFile(url);
// var content = fs.read(file);

content = "<meta charset='gbk'><meta charset='gbk><meta charset=gbk'><meta charset=gbk>";
//s = s.replace(/gbk/i, 'utf-8');
// content = s.replace(/charset\s*=[\s"']*([^\s"'/>]*)/, 'charset=utf-8');
content = content.replace(/gbk|gb2312|big5|gb18030/gi, 'utf-8');

console.log(content);

phantom.exit();
