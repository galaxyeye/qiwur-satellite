var fs = require("fs");
var system = require("system");

var args = system.args;
if (args.length < 1) {
    console.log("Usage : ./bin/satellite src/disable_scripts <dir>");
    phantom.exit(0);
}

var dir = args[0];

if (dir.lastIndexOf("/") !== dir.length - 1) {
    dir += fs.separator;
}
var scripts = fs.list(dir);
for(var i = 0; i < scripts.length; i++) {
    var file = dir + scripts[i];

    if(file.indexOf("html") !== -1 && fs.isFile(file)) {
        console.log(file);

        var html = fs.read(file);
        // html = html.replace(/script/gi, "script-removed");
        // html = html.replace(/script-removed/gi, "script");
        html = html.replace(/init\.js\?v=20151102/i, "init.rm.js?v=20151102");
        fs.write(file, html, "w");
    }
}

phantom.exit(0);
