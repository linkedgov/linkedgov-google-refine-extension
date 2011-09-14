/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The global LinkedGov object for the Index page.
 * 
 * Contents:
 * - Global variables (debug on / off)
 * - Initialisation functions
 * - Initial injection functions
 * - Form validation
 * 
 * Notes:
 * 
 * When switching between sources to import from, they are both in 
 * their own separate panel. Because we want to add a form to the import 
 * page, it has to exist as it's own fixed panel below them, so as not 
 * to have two forms and avoiding duplication. For now, the result isn't ideal as 
 * we're left with a scrolling panel and a hidden "Next" button, but 
 * functionally it's what's needed.
 * 
 */
var LinkedGov = {

		vars : {
			debug:true
		},

		/*
		 * Kicks off the functions included on the index page
		 */
		initialise: function() {

			this.disableFeatures();
			this.restyle();
			this.injectMetaDataForm();
		},

		/*
		 * disableFeatures
		 *
		 * Removes the clipboard & gdata import sources' 
		 * HTML, as well as the Open Project and Import Project tabs which 
		 * are already hidden.
		 * 
		 * Safari (and perhaps some other browsers) has some sort 
		 * of delay when creating the UI objects due to an AJAX post. An 
		 * interval of 1ms is used - and oddly only ever seems to iterate 
		 * once. Without the interval, errors are thrown due to 'undefined' 
		 * objects.
		 * 
		 */
		disableFeatures: function() {


			// Set up a timer to wait until 
			var interval = setInterval(function(){

				if(typeof Refine.actionAreas[0].ui._sourceSelectionUIs[2] == 'undefined' 
					&& typeof Refine.actionAreas[0].ui._sourceSelectionUIs[3] == 'undefined'){

					log("Import source UIs are undefined...")

				} else {

					var createProjectArea = {};
					var actionAreas = Refine.actionAreas;

					for(var i=0, len=actionAreas.length; i<len; i++){				
						switch(actionAreas[i].id) {
						case "create-project" :
							createProjectArea = actionAreas[i];
							break;
						case "open-project" || "import-project" :
							actionAreas[i].bodyElmt.remove();
							actionAreas[i].tabElmt.remove();
							break;
						default:
							break;
						}		
					}

					var sources = createProjectArea.ui._sourceSelectionUIs;

					for(var j=0, len=sources.length; j<len; j++){
						console.log(sources[j].id);
						switch(sources[j].id) {		
						case "clipboard" :
							sources[j]._divBody.remove();
							sources[j]._divHeader.remove();
							break;		
						case "gdata-source" : 
							sources[j]._divBody.remove();
							sources[j]._divHeader.remove();
							break;					
						default:
							break;
						}
					}

					// Make sure the create-project area is visible
					$(createProjectArea.bodyElmt).css("visibility","visible");	

					// Add our own window.resize function that needs to resize the metadata form panel
					$(window).bind("resize",function(){
						$("td#linkedgov-metadata-form").height($(window).height()-$("td#linkedgov-metadata-form").offset().top);
					});		

					// Invoke a window resize to make sure the form is sized properly
					$(window).resize();

					// Hide the "Add URL" button from the Web URL sources panel
					$("button[bind='addButton']").hide();

					/*
					 * Hide the original proceed button because we want to place it
					 * at the end of the metadata form.
					 */ 
					$("div.create-project-ui-source-selection-tab-body").find("button[bind='nextButton']").hide();

					// Destroy the interval variable
					clearInterval(interval);
				}
			},1);

		},

		/*
		 * restyle
		 * 
		 * Any instant style changes to be made on page load
		 */
		restyle: function() {
			$("body").addClass("lg");
			$("#left-panel").hide();
		},

		/*
		 * injectMetaDataForm
		 * 
		 * Finds the HTML element that will house LinkedGov's metadata form.
		 */
		injectMetaDataForm: function() {

			$("table#create-project-ui-source-selection-layout").append(
					"<tr>" +
					"<td class='spacer'><button id='dummy'>Dummy text</button></td>" +
					"<td id='linkedgov-metadata-form'><!-- inject --></td>" +
			"</tr>");

			$("table tr td#linkedgov-metadata-form").html(DOM.loadHTML("linkedgov", "html/index/metadata-form.html"));
			$('div.metadata').parent().parent().scrollTop(0);

		},

		/*
		 * validateForm
		 * 
		 * Includes form validation and displays relevant error 
		 * 	messages to the user.
		 */
		validateForm: function() {

			var source = '';
			var error = false;
			var errorMessages = "";

			if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='urlInput']").length === 1){
				// User is downloading data
				source = "urlInput";
			} else if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='fileInput']").length === 1){
				// User is uploading data
				source = "fileInput"
			} else {
				alert("Data source error");
			}

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

			if ($("input#data-webpage-input").val() == "http://" || $("input#data-webpage-input").val() == "") {
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

			if ($("input#data-description-webpage-input").val() == "http://" || $("input#data-description-webpage-input").val() == "") {
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

		},

		/*
		 * loadHTMLCallback
		 * 
		 * Called each time HTML is loaded, either through LinkedGov or 
		 * Refine.
		 */		
		loadHTMLCallback: function(htmlPage) {

			//log(htmlPage+" has been loaded");

			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			htmlPage = htmlPage.replace(".html","");

			switch (htmlPage) {

			case 'metadata-form' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');
				break;

			case 'parsing-panel' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');
				break;

			case 'excel-parser-ui' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');										
				break;

			case 'parsing-panel' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');				
				break;

			case 'separator-based-parser-ui' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');		
				break;

			default:
				break;
			}

			return false;
		}
};

/*
 * DOM.loadHTML
 * 
 * An overriding function that allows a callback function
 * to be called on the success of any HTML injection.
 * 
 * Overriding the main DOM.loadHTML function allows us to inject 
 * our own JS whenever Refine injects HTML.
 */
DOM.loadHTML = function(module, path) {

	if(path == "scripts/index/parser-interfaces/excel-parser-ui.html"){
		module = "linkedgov";
		path = "html/index/excel-parser-ui.html";
	} else if(path == "scripts/index/default-importing-controller/parsing-panel.html"){
		module = "linkedgov";
		path = "html/index/parsing-panel.html";		
	} else if(path == "scripts/index/parser-interfaces/separator-based-parser-ui.html"){
		module = "linkedgov";
		path = "html/index/separator-based-parser-ui.html";		
	}
	
	var fullPath = ModuleWirings[module] + path;
	if (!(fullPath in DOM._loadedHTML)) {
		$.ajax({
			async: false,
			url: fullPath,
			dataType: "html",
			success: function(html) {
				DOM._loadedHTML[fullPath] = html;
				LinkedGov.loadHTMLCallback(fullPath);
			}
		})
	}
	return DOM._loadedHTML[fullPath];
};

function log(str) {
	window.console && console.log && LinkedGov.vars.debug && console.log(str);
}

$(document).ready(function(){

	LinkedGov.initialise();

});