$(document).ready(function(){

	$.get('html/menu.html', function(data) {
		$('body').html(data);
		$.get("scripts/feedback.js");
	});
	
});
