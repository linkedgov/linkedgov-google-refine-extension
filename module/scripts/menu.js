$(document).ready(function(){

	jQuery.get('html/menu.html', function(data) {
		$('body').html(data);
		$.get("scripts/feedback.js",function(){
			$("div#feedback-button").show();
		});
	});
	
});
