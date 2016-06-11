var str = JSON.stringify({a : 1});

console.log(str);

console.log("\x1f");
console.log("\n".charCodeAt(0));
console.log(" ".charCodeAt(0));

var vi = {
    Menu :          "161 640 870 46",
    Categories :    "207 460 1000 50",
    Title :         "277 480 650 26",
    BigImage :      "344 480 447 447",
    Gallery :       "791 480 447 100",
    ProductShow :   "344 977 463 470",
    SimilarEntity : "919 460 1000 221",
    ProductSpec :   "1260 470 750 160",
    ProductDetail : "1614 470 750 170"
};

phantom.exit(0);
