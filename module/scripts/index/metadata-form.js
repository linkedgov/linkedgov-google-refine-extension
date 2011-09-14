/*
 * If the user selects "other" when choosing a data license, then half  
 * of the form needs to be disabled and a license notice message displayed.
 */
$("div.metadata input[name='data-license']").change(function(){
	if($(this).val() === "other"){

		$("div.metadata input#data-license-other-input").removeAttr("disabled");
		// Disabled the rest of the form and display message
		$("div.metadata input#data-webpage-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata input#data-license-webpage-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata input#data-organisation-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata input#data-description-webpage-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata textarea#data-keywords-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata input#data-date-input").attr("disabled","true").parent().parent().hide();
		$("div.metadata select#data-update-freq-input").attr("disabled","true").parent().parent().hide();

		$("div.metadata tr.license-message").show();

	} else{

		$("div.metadata input#data-license-other-input").attr("disabled","true");
		// Enable the rest of the form and remove message
		$("div.metadata input#data-webpage-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata input#data-license-webpage-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata input#data-organisation-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata input#data-description-webpage-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata textarea#data-keywords-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata input#data-date-input").removeAttr("disabled").parent().parent().show();
		$("div.metadata select#data-update-freq-input").removeAttr("disabled").parent().parent().show();	

		$("div.metadata tr.license-message").hide();	
	}
});

/*
 * Invoke jQuery UI calendar
 */
$('input.datepicker').datepicker({
	changeYear:true,
	changeMonth:true
});

/*
 * Inserts dummy text in the form
 */
$("button#dummy").toggle(function(){

	$("div.metadata input#data-name-input").val("Dummy");
	//$("input.default-importing-web-url").val("http://mirrors.ctan.org/macros/latex/contrib/csvsimple/csvsimple-example.csv");
	$("input.default-importing-web-url").val("https://github.com/mhausenblas/addrable/raw/master/data/table2.csv");
	$("input[value='open-license']").attr("checked","true");
	$("div.metadata input#data-license-other-input")
	// Disabled the rest of the form and display message
	$("div.metadata input#data-webpage-input").val("Dummy");
	$("div.metadata input#data-license-webpage-input").val("Dummy");
	$("div.metadata input#data-organisation-input").val("Dummy");
	$("div.metadata input#data-description-webpage-input").val("Dummy");
	$("div.metadata textarea#data-keywords-input").val("Dumb, Dumber");
	$("div.metadata input#data-date-input").val("1/1/1999");
	$("div.metadata select#data-update-freq-input").val("Hourly");

},function(){
	$("div.metadata input#data-name-input").val("");
	$("input.default-importing-web-url").val("");
	$("div.metadata input#data-license-other-input")
	// Disabled the rest of the form and display message
	$("div.metadata input#data-webpage-input").val("");
	$("div.metadata input#data-license-webpage-input").val("");
	$("div.metadata input#data-organisation-input").val("");
	$("div.metadata input#data-description-webpage-input").val("");
	$("div.metadata textarea#data-keywords-input").val("");
	$("div.metadata input#data-date-input").val("");
	$("div.metadata select#data-update-freq-input").val("");
});

/*
 * Add our own handler to the "proceed" button.
 * 
 */
$("button.proceed").click(function(){
	
	LinkedGov.validateForm();

});
