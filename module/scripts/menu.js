$(document).ready(function(){

	jQuery.get('html/menu.html', function(data) {
		$('body').html(data);
		//$('html,body').scrollTop($("#top").offset().top);
	});

	/*
	$("a.nav-button").live("click",function(event){
		event.preventDefault();

		var mode = $(this).attr("href");

		if($(this).attr("href") == "#top"){
			$("iframe#lgIFrame").html("").hide();
			$("div#back").fadeOut(1000);
			//$("div#sidenav").fadeOut("slow"); 
			$("div#nav").fadeIn(1000);

		} else {
			$("div#nav").hide();
			$("iframe#lgIFrame").html("").hide();
			$("div#back").fadeIn(1000);
			//$("div#sidenav").fadeIn("slow"); 

			if(mode == "#import"){
				$("iframe#lgIFrame").attr("src","http://127.0.0.1:3333/?mode=import&ts="+new Date().getTime()).fadeIn(3000);
			} else if(mode == "#resume"){
				$("iframe#lgIFrame").attr("src","http://127.0.0.1:3333/?mode=resume&ts="+new Date().getTime()).fadeIn(3000);
			} else if(mode == "#game") {
			}

		}

	});
*/
	
});
