$(document).ready(function(){

	jQuery.get('html/menu.html', function(data) {
		$('body').html(data);
		$.get("scripts/feedback.js",function(){
		    $("a#send-feedback").removeClass("ui-button").removeClass("ui-button-text-only").show();
		});
	});
	
});
