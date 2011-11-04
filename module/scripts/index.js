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
			debug:true,
			metadataObject:{}
		},

		initialise: function() {

			//this.disableFeatures();
			
			/*
			 * Change logo & slogan
			 */
			$("#header img").attr("src","/extension/linkedgov/images/logo-small.png").attr("height","40");
			$("#header span#slogan").html("Fixing government data");
			
			var mode = $.getUrlVar('mode');
			
			if(mode == "resume"){
				this.restyleOpenProjectArea();
				this.setUpOpenProjectArea();
			} else {
				this.restyleImportArea();
				this.injectMetaDataForm();	
			}
		},
		
		setUpOpenProjectArea:function(){
			
			var div = document.createElement("div");
			div.id = "create-project-ui-source-selection-tab-bodies";
			//document.body.append(div);

			var openProjectArea = {};
			for(var i=0;i<Refine.actionAreas.length;i++){
				if(typeof Refine.actionAreas[i] != 'undefined' && Refine.actionAreas[i].id == "open-project"){
					openProjectArea = Refine.actionAreas[i];
					openProjectArea.bodyElmt.css("z-index","9999");
				} else {
					Refine.actionAreas[i].bodyElmt.remove();
				}
			}
			openProjectArea.bodyElmt.append(div);
			openProjectArea.bodyElmt.css("visibility","visible");
			openProjectArea.bodyElmt.show();
			
			//$(window).unbind("resize");
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
		disableFeaturesForImport: function() {


			//Refine.actionAreas[1].bodyElmt.hide().remove();
			//Refine.actionAreas[2].bodyElmt.hide().remove();
			
			var createProjectArea = {};

			/*
			 * Loop through the index page action areas and 
			 * remove the open & import areas and cache the create 
			 * project area.
			 */
			for(var i=0;i<Refine.actionAreas.length;i++){
				if(typeof Refine.actionAreas[i] != 'undefined' && Refine.actionAreas[i].id == "create-project"){
					createProjectArea = Refine.actionAreas[i];
					createProjectArea.bodyElmt.css("z-index","9999");
				} else {
					Refine.actionAreas[i].bodyElmt.remove();
				}
			}

			// Make sure the create-project area is visible
			createProjectArea.bodyElmt.css("visibility","visible");
			createProjectArea.bodyElmt.show();

			var sources = Refine.DefaultImportingController.sources;

			for(var j=0, len=sources.length; j<len; j++){
				try{
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
				} catch(e){
					log(e);
				}
			}

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

		},

		/*
		 * restyle
		 * 
		 * Any instant style changes to be made on page load
		 */
		restyleImportArea: function() {
			$("body").addClass("lg");
			$("#left-panel").hide();
		},
		
		restyleOpenProjectArea: function(){
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
			$("div#create-project-ui-source-selection").scrollTop(0);

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
			
			metadataObject = LinkedGov.vars.metadataObject;
			
			
			if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='urlInput']").length === 1){
				// User is downloading data
				source = "urlInput";
				metadataObject["LinkedGov.source"] = "urlInput";
			} else if($("div.create-project-ui-source-selection-tab-body.selected").find("input[bind='fileInput']").length === 1){
				// User is uploading data
				source = "fileInput";
				metadataObject["LinkedGov.source"] = "fileInput";
			} else {
				//alert("Data source error");
				errorMessages += "<li>You must specify a source to import data from. Please select a file to upload or enter a web address to download from.</li>";
			}

			if ($("input#data-name-input").val().length < 1) {
				error = true;
				errorMessages += "<li>You must specify a project name</li>";
				$("#data-name-input").addClass("error");
			} else {
				$("#data-name-input").removeClass("error");
				metadataObject["LinkedGov.name"] = $("input#data-name-input").val();
			}

			if (typeof $("input[@name=project-license]:checked").val() == 'undefined') {
				error = true;
				errorMessages += "<li>You must choose a project license</li>";
				$("div.metadata tr.license td").addClass("error");
			} else if($("input[@name=project-license]:checked").val() == 'other'){
				error = true;
				/*
				 * Send data off to LinkedGov to notify them that somebody has data with 
				 * a special case of licensing.
				 */
			} else {
				$("div.metadata tr.license td").removeClass("error");
				metadataObject["LinkedGov.license"] = $("input[@name=project-license]:checked").val();
			}

			if ($("input#data-webpage-input").val() == "http://" || $("input#data-webpage-input").val() == "") {
				error = true;
				errorMessages += "<li>You must specify the dataset's webpage</li>";
				$("input#data-webpage-input").addClass("error");
			} else {
				$("input#data-webpage-input").removeClass("error");
				metadataObject["LinkedGov.webLocation"] = $("input#data-webpage-input").val();
			}

			if ($("input#data-organisation-input").val().length === 0) {
				error = true;
				errorMessages += "<li>You must specify a source organisation for the dataset</li>";
				$("input#data-organisation-input").addClass("error");
			} else {
				$("input#data-organisation-input").removeClass("error");
				metadataObject["LinkedGov.organisation"] = $("input#data-organisation-input").val();
			}

			if ($("input#data-description-webpage-input").val() == "http://" || $("input#data-description-webpage-input").val() == "") {
				error = true;
				errorMessages += "<li>You must specify a location for the description of the dataset</li>";
				$("input#data-description-webpage-input").addClass("error");
			} else {
				$("input#data-description-webpage-input").removeClass("error");
				metadataObject["LinkedGov.descriptionLocation"] = $("input#data-description-webpage-input").val();
			}

			if ($("textarea#data-keywords-input").val().length === 0) {
				error = true;
				errorMessages += "<li>You must enter at least one keyword for describing this dataset</li>";
				$("textarea#data-keywords-input").addClass("error");
			} else {
				$("textarea#data-keywords-input").removeClass("error");
				metadataObject["LinkedGov.keywords"] = $("textarea#data-keywords-input").val();
			}	

			if(!error){   
				$("div.create-project-ui-source-selection-tab-body.selected form").find("button[bind='nextButton']").click();
			} else {
				errorMessages += "</ul>";
				$('div.metadata').parent().parent().scrollTop(0);
				$("div.metadata ul.errorMessages").html(errorMessages).show().focus();
			}	
			
			
			/*
			 * Store the other form fields that are not required
			 */
			if($("input#data-license-webpage-input").val().length > 0 && $("input#data-license-webpage-input").val() != "http://"){
				metadataObject["LinkedGov.licenseLocation"] = $("input#data-license-webpage-input").val();
			}
			
			if($("input#data-date-input").val().length > 0){
				metadataObject["LinkedGov.datePublished"] = $("input#data-date-input").val();
			}
			
			if($("select#data-update-freq-input").val() != "Please select..."){
				metadataObject["LinkedGov.frequency"] = $("select#data-update-freq-input").val();
			}

		},
		
		saveMetadata:function(jobID, projectID, callback){
			
			var self = this;

			LinkedGov.vars.metadataObject.project = projectID;
			
			$.ajax({
				type : "POST",
				url : "/command/" + "linkedgov" + "/" + "save-meta-information",
				data : $.param(LinkedGov.vars.metadataObject),
				success : function(data) {
					callback(jobID,projectID);
				},
				error : function() {
					self.importFail("A problem was encountered when saving metadata");
				}
			});
			
		},
		
		importFail:function(message){
				
			alert(message);
		
		},

		resizeParsingPanel:function(){

			log("resizeParsingPanel");

			var self = Refine.DefaultImportingController.sources[0].ui._controller;

			self._parsingPanelResizer = function(){

				$("body.lg div.default-importing-parsing-control-panel")
				.css("height","auto")
				.css("bottom","0px")
				.css("left","0px")
				.css("padding-left","5px")
				.css("top","34px")
				.css("width","295px");

				$("body.lg div.default-importing-progress-data-panel")
				.css("bottom", "0")
				.css("left","305px")
				.css("height","auto")
				.css("padding-top", "150px")
				.css("right", "0")
				.css("top", "34px")
				.css("width","auto");


				$("body.lg div.default-importing-parsing-data-panel")
				.css("height","auto")
				.css("bottom","0px")
				.css("left","300px")
				.css("overflow-y","auto")
				.css("right","0px")
				.css("top","34px")
				.css("width","auto");

				$("body.lg div#right-panel-body")
				.css("bottom","0px")
				.css("overflow","auto")
				.css("margin-left","5px")
				.css("margin-top","5px")
				.css("position","static")
				.css("top","0px");

				$("body.lg div#right-panel")
				.css("left","0px !important")
				.css("width","100% !important")
				.css("bottom","0px")
				.css("top","60px")
				.css("visibility","visible")
				.css("height","auto");

				// DS - alter the widths of the td elements that hold the checkboxes & inputs for the parsing panels
				$('td.default-importing-parsing-control-panel-options-panel').children().find('div.grid-layout').children().find('td').each(function(){
					if($(this).attr('width') === "1%"){
						$(this).removeAttr('width').css('width','25px');
					}
				});

			}

			$(window).unbind("resize");
			$(window).bind("resize", self._parsingPanelResizer);
			$(window).resize();

		},

		/*
		 * loadHTMLCallback
		 * 
		 * Called each time HTML is loaded, either through LinkedGov or 
		 * Refine.
		 */		
		loadHTMLCallback: function(htmlPage) {

			var self = this;

			//log(htmlPage+" has been loaded");

			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			var pageName = htmlPage.replace(".html","");

			switch (pageName) {

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
		},

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

Refine.DefaultImportingController.prototype._onImportJobReady = function() {
	this._prepareData();
	if (this._job.config.retrievalRecord.files.length > 1) {
		this._showFileSelectionPanel();
	} else {
		this._showParsingPanel(false);
	}

	LinkedGov.resizeParsingPanel();

	$(window).unbind("resize");
	$(window).bind("resize",Refine.DefaultImportingController.sources[0].ui._controller._parsingPanelResizer);
	$(window).resize();
};


/*
 * Override the pollImportJob
 */

LinkedGov.pollImportJob = Refine.CreateProjectUI.prototype.pollImportJob;

Refine.CreateProjectUI.prototype.pollImportJob = function(start, jobID, timerID, checkDone, callback, onError) {

	/*
	 * Create our own "callback" function
	 */
	lgCallback = function(jobID,job) {

		/*
		 * This function is accessed twice by Refine, the first time to 
		 * send the user to the "preview" panel when they can modify the 
		 * import options, and the second time, with the projectID to the 
		 * "project" page.
		 * 
		 * The second time round is when the projectID is present, so we 
		 * intercept and fire-off a call to save our custom metadata.
		 */
		if(typeof job.config.projectID != 'undefined'){
			
			
			LinkedGov.saveMetadata(jobID, job.config.projectID, function(jobID, projectID){
				Refine.CreateProjectUI.cancelImportinJob(jobID);
				document.location = "project?project=" + projectID;
			});
			
			
		} else {
			callback(jobID,job);
		}

	};

	LinkedGov.pollImportJob(start, jobID, timerID, checkDone, lgCallback, onError);
}


$.extend({
	getUrlVars: function(){
		var vars = [], hash;
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		return vars;
	},
	getUrlVar: function(name){
		return $.getUrlVars()[name];
	}
});

$(document).ready(function(){

	LinkedGov.initialise();

});