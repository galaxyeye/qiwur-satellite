function extractCharsetFromMeta() {
	var str = [
	"text/html; charset=utf-8",
	"<meta  charset  =  '  utf-8'     >",
	'<meta name="title" value="charset=utf-8 — is it really useful (yep)?">',
	'<meta  http-equiv  =  Content-Type  content  =  text/html  ;  ;  ;  charset  =  iso-8859-1  >'
	];
	
	for (var i = 0; i < str.length; ++i) {
		var result = str[i].match(/<meta(?!\s*(?:name|value)\s*=)(?:[^>]*?content\s*=[\s"']*)?([^>]*?)[\s"';]*charset\s*=[\s"']*([^\s"'/>]*)/);
	
		if (result && result.length > 2) {
			console.log(result[2]);
		}
		else {
			console.log(result);
		}
	}	
}

function extractCharsetFromContentType() {
	var str = [
	   	"text/html; charset=utf-8",
	   	"text/html; charset=gb2312",
	   	'application/x-javascript; charset=gb2312',
	   	'<meta  http-equiv  =  Content-Type  content  =  text/html  ;  ;  ;  charset  =  iso-8859-1  >',
		"<meta  charset  =  '  utf-8'     >",
		"<meta  content  =  text/html  ;  ;  ;  charset  =  iso-8859-1  http-equiv  =  Content-Type  >"
   	];

   	for (var i = 0; i < str.length; ++i) {
   		var s = str[i].replace(/charset\s*=[\s"']*([^\s"'/>]*)/, 'charset=utf-8');
   		console.log(s);
   	}
}

phantom.exit();
