var str = "ECM_ID=91e854f67f6817c733be18c01de3353f156c12aa; path=/\n\tPHPSESSID=3tahn5jc8e6j15rl028uoscua4; path=/\nECS[visit_times]=1; expires=Thu, 23-Apr-2015 03:37:14 GMT; Max-Age=31536000; path=/\nuser_ucookies=f4bd9e66-ca97-11e3-bb8d-21533e3c7287; expires=Sat, 20-Apr-2024 03:37:14 GMT; Max-Age=315360000; path=/";
str = str.replace(/\n\t*/g, "\n\t");

console.log(str);

phantom.exit();