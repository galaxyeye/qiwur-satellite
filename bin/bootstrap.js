/**
 *
 * */
"use strict";

var system = require('system');
var fs = require('fs');

if (phantom.satelliteInitialized) {
    console.warn("satellite is already initialized");
    // return;
}

phantom.satelliteInitialized = true;

/**
 * note : libraryPath does not support multiple path yet
 * see : https://github.com/ariya/phantomjs/issues/10198
 * */
phantom.libraryPath = fs.workingDirectory + fs.separator + "src/lib/client";
phantom.vendorPath = fs.workingDirectory + fs.separator + "vendor";

/**
 * Four args : system args, phantom args, casper args, satellite args
 * the library user should use satellite args only
 * */
var phantomArgs = system.args.slice(1);

try {
    phantom.casperPath = phantomArgs.map(function _map(arg) {
        var match = arg.match(/^--casper-path=(.*)/);
        if (match) {
            return fs.absolute(match[1]);
        }
    }).filter(function _filter(path) {
        return fs.isDirectory(path);
    }).pop();

    // extract satelliteArgs, this is the true args our program can use
    phantom.satelliteArgs = [];
    var found = false;
    for (var i = 0; i < phantomArgs.length; ++i) {
        if (phantomArgs[i] === '--cli') {
            found = true;
            continue;
        }

        if (!found) {
            continue;
        }
        else {
            phantom.satelliteArgs.push(phantomArgs[i]);
        }
    }
    // remove the first element
    phantom.satelliteArgs = phantom.satelliteArgs.slice(1);
} catch (e) {
    console.error("Couldn't find nor compute phantom.casperPath, exiting.");
    setTimeout(function() { phantom.exit(1); }, 0);
}

/**
 * execScript and Vendor
 * */
(function (global, phantom, fs) {
    if (!global.execScript) {
        global.execScript = function(file) {
            var script = fs.read(file);
            eval(script);
        }
    }

    /**
     * include and execute a script file, file is either a relative path or a absolute path
     * */
    if (!global.include) {
        global.include = function(file) {
            var script = fs.read(file);
            eval(script);
        }
    }

    var requireVendor = function(require) {
        function getCurrentScriptRoot() {
            if ((phantom.vendorPath || "").indexOf(fs.workingDirectory) === 0) {
                return phantom.vendorPath;
            }
            return fs.absolute(fs.pathJoin(fs.workingDirectory, phantom.vendorPath));
        }
        function resolveFile(path, dir) {
            var extensions = ['js', 'json'];
            var basenames = [path, path + '/index'];
            var paths = [];
            basenames.forEach(function(basename) {
                paths.push(fs.absolute(fs.pathJoin(dir, basename)));
                extensions.forEach(function(extension) {
                    paths.push(fs.absolute(fs.pathJoin(dir, [basename, extension].join('.'))));
                });
            });
            for (var i = 0; i < paths.length; i++) {
                if (fs.isFile(paths[i])) {
                    return paths[i];
                }
            }
            return null;
        }
        function vendorModulePath(vendor, project, name) {
            var resolved, prevBaseDir;
            var baseDir = getCurrentScriptRoot() + fs.separator +　vendor + fs.separator + project;
            do {
                resolved = resolveFile(name, fs.pathJoin(baseDir, 'modules'));
                prevBaseDir = baseDir;
                baseDir = fs.absolute(fs.pathJoin(prevBaseDir, '..'));
            } while (!resolved && baseDir !== '/' && prevBaseDir !== '/' && baseDir !== prevBaseDir);
            return resolved;
        }
        var requiredVendor = function requiredVendor() {
            try {
                var vendor, project, name;
                if (arguments.length >= 3) {
                    vendor = arguments[0];
                    project = arguments[1];
                    name = arguments[2];
                }
                else if (arguments.length == 2) {
                    vendor = 'warps';
                    project = arguments[0];
                    name = arguments[1];
                }
                else if (arguments.length == 1) {
                    vendor = 'warps';
                    project = 'satellite';
                    name = arguments[0];
                }
                else {
                    throw new CasperError("Invalid arguments");
                }

                return require(vendorModulePath(vendor, project, name));
            } catch (e) {
                throw new CasperError("Can't find module " + vendor + project + name);
            }
        };
        
        return requiredVendor;
    }; // requireVendor

    global.vendor = requireVendor(global.require);
})(window, phantom, require('fs'));

/**
 * Compact all client js
 * */
(function compactClientJs() {
    var relativePath = "src/lib/client";
    var clientLibraryPath = fs.workingDirectory + fs.separator + relativePath;
    var content = "/**\n";
    content    += " * This file is automatically generated by satellite framework, please *DO NOT* modify the file. \n";
    content    += " * Generate time : " + new Date() + ". \n";
    content    += " **/";
    content    += "\n\n";

    // Get a list all files in directory
    var scripts = fs.list(clientLibraryPath);
    // Cycle through the list
    for(var i = 0; i < scripts.length; i++) {
        // Note: If you didn't end path with a slash, you need to do so here.
        var file = clientLibraryPath + fs.separator + scripts[i];

        if(file.indexOf("js") !== -1 && fs.isFile(file)) {
            content += "/**\n";
            content += " * Original script file : " + relativePath + fs.separator + scripts[i] + ". \n";
            content += " **/";
            content += "\n\n";

            var s = fs.read(file);
            content += s;
            content += "\n";
        }
    }

    fs.write(clientLibraryPath + fs.separator + "dist/satellite.full.js", content, "w");
    // TODO : compact files
    fs.write(clientLibraryPath + fs.separator + "dist/satellite.compact.js", content, "w");
    // TODO : compact files
    fs.write(clientLibraryPath + fs.separator + "dist/satellite.min.js", content, "w");
})();

/**
 * Load casperjs
 * */
(function loadCasperJS(casperPath) {
    var casperLoader = casperPath + fs.separator + "bin/bootstrap.js";
    execScript(casperLoader);
})(phantom.casperPath);
