$(document).ready(function(){
		
    jQuery.get('html/menu.html', function(data) {
        $('body').html(data);
    	$('html,body').scrollTop($("#top").offset().top);
    });
    
    $("a.nav-button").live("click",function(event){
    	event.preventDefault();

    	var mode = $(this).attr("href");
    	
    	if($(this).attr("href") == "#top"){
    		$("div#back").fadeOut("slow");
    		//$("div#sidenav").fadeOut("slow"); 
    		$("div#frame").fadeOut(1000,function(){
    			$("div#nav").fadeIn(1000);
    			$("iframe#lgIFrame").html("").hide();
    		});
    		
    	} else {
    		$("div#back").fadeIn("slow");
    		//$("div#sidenav").fadeIn("slow"); 
    		$("iframe#lgIFrame").hide();
    		$("div#nav").fadeOut(1000,function(){
    			$("div#frame").show();
        		if(mode == "#import"){
        	    	$("iframe#lgIFrame").attr("src","http://127.0.0.1:3333/?mode=import&ts="+new Date().getTime()).fadeIn(1000);
        		} else if(mode == "#resume"){
        	    	$("iframe#lgIFrame").attr("src","http://127.0.0.1:3333/?mode=resume&ts="+new Date().getTime()).fadeIn(1000);
        		} else if(mode == "#game") {
        	    	$("iframe#lgIFrame").attr("src","http://www.bow-man.net/flash/bowman-game.swf?ts="+new Date().getTime()).fadeIn(1000);
        		}
    		});
    	}

    });

});
