/*
 * Safari (and perhaps some other browsers) has some sort 
 * of delay when creating the UI objects. An interval of 1ms 
 * is used - and oddly only ever seems to iterate once. Without 
 * the interval, errors are thrown due to 'undefined' objects.
 * 
 * This block of code removes the clipboard & gdata import sources 
 * HTML, as well as the Open Project and Import Project tabs which 
 * are already hidden.
 */
var interval = setInterval(function(){
	if(typeof Refine.actionAreas[0].ui._sourceSelectionUIs[2] == 'undefined' && typeof Refine.actionAreas[0].ui._sourceSelectionUIs[3] == 'undefined'){
		LinkedGov.console.log("Undefined! Weird.")
	}else{
		
		var createProjectArea = Refine.actionAreas[0];
		
		// Remove clipboard source HTML
		var clipboardHTML = createProjectArea.ui._sourceSelectionUIs[2];
		$(clipboardHTML._divBody).remove();
		$(clipboardHTML._divHeader).remove();

		// Remove the GData source HTML
		var gdataHTML = createProjectArea.ui._sourceSelectionUIs[3];
		$(gdataHTML._divBody).remove();
		$(gdataHTML._divHeader).remove();

		// Remove the Open Project HTML
		var openProjectArea = Refine.actionAreas[1];
		openProjectArea.bodyElmt.remove();
		openProjectArea.tabElmt.remove();

		// Remove the Import Project HTML
		var importProjectArea = Refine.actionAreas[2];
		importProjectArea.bodyElmt.remove();
		importProjectArea.tabElmt.remove();

		$(createProjectArea.bodyElmt).css("visibility","visible");	

		$(window).bind("resize",function(){
			$("td#linkedgov-metadata-form").height($(window).height()-$("td#linkedgov-metadata-form").offset().top);
		});		

		$(window).resize();
		
		clearInterval(interval);
		
		$("button[bind='addButton']").hide();
		$("div.create-project-ui-source-selection-tab-body").find("button[bind='nextButton']").hide();

	}
},1);


// Activate "other" license text field when clicked
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

// Invoke jQuery UI calendar
$('input.datepicker').datepicker({
	changeYear:true,
	changeMonth:true
});

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

$("button.proceed").click(function(){
	//$("button[bind='nextButton']").eq(0).click();
	
	//fileInput
	//urlInput
	var source = '';
	if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='urlInput']").length === 1){
		// User is downloading data
		source = "urlInput";
	} else if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='fileInput']").length === 1){
		// User is uploading data
		source = "fileInput"
	} else {
		alert("Data source error");
	}

	
    var error = false;
    var errorMessages = "";
    
    if ($("input#data-name-input").val().length < 1) {
    	error = true;
    	errorMessages += "<li>You must specify a project name</li>";
    	$("#data-name-input").addClass("error");
	} else {
		$("#data-name-input").removeClass("error");
	}
		
	if (typeof $("input[@name=project-license]:checked").val() == 'undefined') {
		error = true;
		errorMessages += "<li>You must choose a project license</li>";
    	$("div.metadata tr.license td").addClass("error");
	} else {
		$("div.metadata tr.license td").removeClass("error");
	}
	
	if ($("input#data-webpage-input").val() == "http://") {
		error = true;
		errorMessages += "<li>You must specify the dataset's webpage</li>";
    	$("input#data-webpage-input").addClass("error");
	} else {
		$("input#data-webpage-input").removeClass("error");
	}
	
	if ($("input#data-organisation-input").val().length === 0) {
		error = true;
		errorMessages += "<li>You must specify a source organisation for the dataset</li>";
    	$("input#data-organisation-input").addClass("error");
	} else {
		$("input#data-organisation-input").removeClass("error");
	}
	
	if ($("input#data-description-webpage-input").val() == "http://") {
		error = true;
		errorMessages += "<li>You must specify a location for the description of the dataset</li>";
    	$("input#data-description-webpage-input").addClass("error");
	} else {
		$("input#data-description-webpage-input").removeClass("error");
	}

	if ($("textarea#data-keywords-input").val().length === 0) {
		error = true;
		errorMessages += "<li>You must enter at least one keyword for describing this dataset</li>";
    	$("textarea#data-keywords-input").addClass("error");
	} else {
		$("textarea#data-keywords-input").removeClass("error");
	}	
	
	if(!error){   
		$("div.create-project-ui-source-selection-tab-body.selected form").find("button[bind='nextButton']").click();
    } else {
    	errorMessages += "</ul>";
    	$('div.metadata').parent().parent().scrollTop(0);
    	$("div.metadata ul.errorMessages").html(errorMessages).show().focus();
    }	
	
	
	
	/*
	 * <form bind="form" 
	 * method="post" 
	 * enctype="multipart/form-data" 
	 * accept-charset="UTF-8" 
	 * target="create-project-iframe" 
	 * action="/command/core/importing-controller?controller=core%2Fdefault-importing-controller&amp;jobID=1314537795640&amp;subCommand=load-raw-data"><div class="grid-layout layout-normal">
	 * <table>
  <tbody><tr><td>Locate one or more files on your computer to upload:</td></tr>
  <tr><td><input type="file" name="upload" bind="fileInput" multiple=""></td></tr>
  <tr><td><button type="button" class="button button-primary" bind="nextButton">Next »</button></td></tr>
</tbody></table></div></form>
	 */
	
	//Refine.actionAreas[0].ui._controllers[0].startImportJob(self._elmts.form, "Uploading data ...");
});
