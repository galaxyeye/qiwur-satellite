var utils = require('utils');
var configure = vendor('configure').create();

var properties1 = {
    // "name": "jd.com",
    // "page.index.main": "#J_goodsList",
    // "page.index.paginator.selector": "#J_bottomPage",
    // "nickname" : [
    //     {
    //         "nickname.first.name" : "no such name"
    //     }
    // ]
};

// var properties2 = {
//     "name": "jd.com",
//     "page.index.main": "#J_goodsList",
//     "page.index.paginator.selector": "#J_bottomPage",
//     "page.index.paginator.next": ".pn-next",
//     "page.index.start": 1,
//     "page.index.limit": 1,
//     "page.detail.regex": "(.+)item.jd.com(.+)",
//     "page.detail.start": 1,
//     "page.detail.limit": 1
// };

var properties2 = {
    "apple": "name",
    "apple.banana" : "apple.banana"
};

var obj = configure.buildObject(properties1);
utils.dump(obj);
obj = configure.buildObject(properties2);
utils.dump(obj);

phantom.exit(0);
