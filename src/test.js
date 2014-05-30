var fs = require("fs");

var arrayUnique = function(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

var result = JSON.parse(fs.read("/home/vincent/workspace/t/batchid.json"));

var ids = [];
for (var i = 0; i < result.length; ++i) {
	ids.push(result[i].batchId);
}

console.log(JSON.stringify(arrayUnique(ids)));

phantom.exit();
