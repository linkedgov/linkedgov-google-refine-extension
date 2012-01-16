$("a#send-feedback").live("click",function(){

	$.get("/extension/linkedgov/html/feedback-form.html",function(data){
		
		var feedbackForm = DialogSystem.createDialog();
		$(feedbackForm).width(400);
		var header = $('<div></div>').addClass("dialog-header").text("Feedback").appendTo(feedbackForm);
		var body = $('<div></div>').addClass("dialog-body").appendTo(feedbackForm);
		var footer = $('<div></div>').addClass("dialog-footer").appendTo(feedbackForm);
		
		$(body).html(data);
/*
		var name = $( "#name" ),
		email = $( "#email" ),
		comment = $( "#comment" ),
		allFields = $( [] ).add( name ).add( email ).add( comment ),
		tips = $( ".validateTips" );
*/
		//var tips = $( ".validateTips" );
		//console.log(name, email, comment, tips);
		
		function updateTips( t ) {
			$( ".validateTips" )
			.text( t )
			.addClass( "ui-state-highlight" );
			setTimeout(function() {
				$( ".validateTips" ).removeClass( "ui-state-highlight", 1500 );
			}, 500 );
		}
		
		function checkLength( o, n, min, max ) {
			if ( o.val().length > max || o.val().length < min ) {
				o.addClass( "ui-state-error" );
				updateTips( "Length of " + n + " must be between " +
						min + " and " + max + "." );
				return false;
			} else {
				return true;
			}
		}

		function checkRegexp( o, regexp, n ) {
			if ( !( regexp.test( o.val() ) ) ) {
				o.addClass( "ui-state-error" );
				updateTips( n );
				return false;
			} else {
				return true;
			}
		}
		
		$('<button></button>').addClass('button').html("&nbsp;&nbsp;Send&nbsp;&nbsp;").click(function() {
			
			var bValid = true;
			//allFields.removeClass( "ui-state-error" );

			bValid = bValid && checkLength( $( "#name" ), "name", 3, 30 );
			bValid = bValid && checkLength( $( "#email" ), "email", 6, 80 );
			bValid = bValid && checkLength( $( "#comment" ), "comment", 0, 1000 );

			bValid = bValid && checkRegexp( $( "#name" ), /^[a-z]([0-9a-z_])+$/i, "Name may consist of a-z, 0-9, underscores, begin with a letter." );
			// From jquery.validate.js (by joern), contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
			bValid = bValid && checkRegexp( $( "#email" ), /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i, "e.g. johnsmith@email.com" );
			//bValid = bValid && checkRegexp( comment, /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9" );

			if ( bValid ) {
				alert("Sent feedback! (Not)");
				DialogSystem.dismissAll();
			} else {
				$( ".validateTips" ).show();
			}		
			
		}).appendTo(footer);

		$('<button></button>').addClass('button').text("Cancel").click(function() {
			DialogSystem.dismissAll();
		}).appendTo(footer);


		DialogSystem.showDialog(feedbackForm);
		
		
	});

});