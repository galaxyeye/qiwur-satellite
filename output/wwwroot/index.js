$(document).ready(function() {
	$('.command li a').click(function() {
		$('.message').load(this.href);
		return false;
	});

	setInterval(function() {
		$.get("/status", null, function(responseText) {
			if (responseText.length < 15) {
				$(".status").html(responseText);
			}
			else {
				var processes = $.parseJSON(responseText);

				var status = "<ul>";
				for (var i = 0; i < processes.length; ++i) {
					status += "<li>";
					status += "status : " + processes[i].status;
					if (processes[i].process) {
						status += " pid : " + processes[i].process.pid;
					}
					status += " port : " + processes[i].port;
					status += "</li>";
				}
				status += "</ul>";

				$(".status").html(status);	
			}
		});	
	}, 3000);
});
