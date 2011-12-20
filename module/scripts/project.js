/*
 * LinkedGov extension for Google Refine
 * Author: Dan Smith
 * 
 * project.js
 * 
 * LinkedGov object for the project page.
 * 
 * - Injects the "typing" panel
 * - Loads typing panel wizards
 * - Provides variables and generic functions for the page and the wizards
 * 
 */
var LinkedGov = {

		/*
		 * Global variables used across multiple wizards
		 */
		vars : {
			debug : true,
			separator : "<LG>",
			nullValue : "<LG_NULL>",
			blanksSetToNulls : false,
			rdfSchema : {
				prefixes : [],
				baseUri : "http://127.0.0.1:3333/",
				rootNodes : []
			},
			labelsAndDescriptions : {
				rowLabel : "",
				rowDescription : "",
				cols : []
			},
			lgNameSpace: "http://example.linkedgov.org/",
			hiddenColumns: ""
			//wizardOperations:[]
		},

		/*
		 * initialise
		 * 
		 * Initial styling and injections
		 */
		initialise : function() {

			$("#app-home-button").remove();
			
			this.restyle();
			this.injectTypingPanel();
			this.injectWizardProgressOverlay();
			this.injectFeedbackForm();
			this.addUnhideColumnButton();
			this.quickTools();
			
			
			
			/*
			 * Add a listener for un-hiding columns
			 */
			$("td.column-header").live("click",function(){
				if($(this).find("span.column-header-name").length == 0){
					Refine.update({
						modelsChanged:true
					});
				}
			});
			
			/*
			 * Load the wizard scripts
			 */
			$.getScript("extension/linkedgov/scripts/project/address-wizard.js",function(){
				LinkedGov.addressWizard = addressWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/datetime-wizard.js",function(){
				LinkedGov.dateTimeWizard = dateTimeWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/geolocation-wizard.js",function(){
				LinkedGov.geolocationWizard = geolocationWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/measurements-wizard.js",function(){
				LinkedGov.measurementsWizard = measurementsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/columnsToRows-wizard.js",function(){
				LinkedGov.columnsToRowsWizard = columnsToRowsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/rowsToColumns-wizard.js",function(){
				LinkedGov.rowsToColumnsWizard = rowsToColumnsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/nullvalue-wizard.js",function(){
				LinkedGov.nullValueWizard = nullValueWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/enumeration-wizard.js",function(){
				LinkedGov.enumerationWizard = enumerationWizard;
			});	
			/*
			 * Load the refine operations script
			 */
			$.getScript("extension/linkedgov/scripts/project/refine-operations.js",function(){
				LinkedGov.splitVariablePartColumn = splitVariablePartColumn;
				
				/*
				 * Load our custom save-rdf operations script
				 */
				$.getScript("extension/linkedgov/scripts/project/rdf-operations.js",function(){
					
					LinkedGov.renameColumnInRDF = renameColumnInRDF;
					LinkedGov.finaliseRDFSchema = finaliseRDFSchema;
					LinkedGov.applyTypeIcons = applyTypeIcons;
					LinkedGov.applyTypeIcons.init();
					LinkedGov.applyTypeIcons.apply();
					
					LinkedGov.saveMetadataToRDF(function(){
						
						LinkedGov.getHiddenColumnMetadata(function(){
							LinkedGov.keepHiddenColumnsHidden();
						});
						
						ui.dataTableView.render2 = ui.dataTableView.render;
						ui.dataTableView.render = function(){

							//log("Rendered table");
							ui.dataTableView.render2();
							LinkedGov.keepHiddenColumnsHidden();
							LinkedGov.applyTypeIcons.apply();

						}

						Refine.update({everythingChanged:true});
						
						//ui.historyPanel.simpleRender = ui.historyPanel._render;
						//ui.historyPanel._render = function() {
						//	LinkedGov.summariseWizardOperations();
						//	ui.historyPanel.simpleRender();
						//}					
						
					});
				});
				
			});
			
		},

		/*
		 * restyle
		 * 
		 * Any major initial restyling
		 */
		restyle : function() {
			/*
			 * Giving the body our own class applies our CSS rules.
			 */
			$("body").addClass("lg");
			
			$("#header").html('<img width="129" height="40" alt="Google Refine" src="/extension/linkedgov/images/logo-small.png"><span id="slogan">Making government data usable</span>'+$("#header").html());
		
			$("body").append("<div id='beta'><p>Alpha</p></div>");
			$("#project-controls").css("margin-right","100px");
			$("#extension-bar").css("margin-right","45px");
		},

		/*
		 * injectTypingPanel
		 * 
		 * Injects the Typing panel HTML and JS into the page
		 */
		injectTypingPanel : function() {

			// Create the Typing tab
			$(".refine-tabs ul li").eq(0).after('<li><a href="#refine-tabs-typing">Typing</a></li>');
			// Create the Typing panel div
			$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			// Load LinkedGov's Typing panel HTML into the div
			$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));

			/*
			 * Bind our own resize function to the window
			 */
			$(window).unbind("resize");
			$(window).bind("resize", LinkedGov.resizeAll_LG);

		},

		/*
		 * injectFeedbackForm
		 * 
		 * Injects the feedback form in the top right of the page
		 */
		injectFeedbackForm : function() {
						
			$.get("/extension/linkedgov/scripts/feedback.js",function(){
				$("div#project-controls").append('<a class="button" id="send-feedback" href="#" title="Send feedback">Feedback</a>');				
			});
			
		},
		
		addUnhideColumnButton : function() {
		
			var self = this;
			
			$("div#project-controls").prepend('<a id="unhide-columns-button" title="Unhide columns" class="button">Unhide columns</a>');
			$("a#unhide-columns-button").live("click",function(){
				LinkedGov.vars.hiddenColumns = "";
				LinkedGov.keepHiddenColumnsHidden();
				Refine.update({modelsChanged:true});
				self.showHideUnhideColumnButton("hide");
			});
		},
		
		showHideUnhideColumnButton : function(showHide){
			(showHide == "show" ? $("a#unhide-columns-button").css("display","inline-block") : $("a#unhide-columns-button").hide());
		},
		
		updateUnhideColumnButton : function(count){
			var self = this;
			if(count > 0){
				var str = "Unhide "+count+" column"+(count == 1 ? "" : "s");
				$("a#unhide-columns-button").html(str).attr("title",str);
				self.showHideUnhideColumnButton("show");
			} else{
				self.showHideUnhideColumnButton("hide");
			}
		},
		
		
		/*
		 * Initialises the quick tools for column headings.
		 */
		quickTools : function() {

			/*
			 * Quick tools 
			 * 
			 * As long as the user is not being asked to select a column,
			 * append a DIV element containing the column quick tools.
			 * 
			 * If a column header already has the quick tool, then show or hide it.
			 * 
			 * TODO: Show & hide using CSS.
			 */
			$("td.column-header").live("hover",function() {
						if (!$(this).hasClass("ui-selectee") && $(this).find("span.column-header-name").length > 0 && $(this).find("span.column-header-name").html() != "All") {
							if ($(this).hasClass("show")) {
								$(this).find(".quick-tool").hide();
								$(this).addClass("hide").removeClass("show");
							} else if ($(this).hasClass("hide")) {
								$(this).find(".quick-tool").show();
								$(this).addClass("show").removeClass("hide");
							} else {

								var html = "<div class='quick-tool'>" + "<ul>"
								+ "<li class='rename'>Rename</li>"
								+ "<li class='remove'>Remove</li>"
								+ "<li class='move-left'>Move left</li>"
								+ "<li class='move-right'>Move right</li>"
								+ "<li class='hide'>Hide</li>"
								+ "<li class='delete-rdf'>Delete RDF</li>"
								+ "</ul>" + "</div>";

								$(this).append(html);
								$(this).find(".quick-tool").show();
								$(this).addClass("qt").addClass("show");
							}
						}
					});

			/*
			 * Interaction for the quick tool options
			 * 
			 * Use the event object returned by jQUery to get the column name
			 */
			$("div.quick-tool").find("li").live("click", function(e) {

				var td = e.target.parentNode.parentNode.parentNode;
				var colName = $(td).find("span.column-header-name").html();

				switch ($(this).attr("class")) {

				case "rename":
					var name = window.prompt("Name:", colName);
					if (name.length > 0) {
						LinkedGov.renameColumn(colName, name, function() {
							Refine.update({
								modelsChanged : true
							});
						});
					}
					break;
				case "remove":
					LinkedGov.removeColumn(colName, function() {
						Refine.update({
							modelsChanged : true
						});
					});
					break;
				case "move-left":
					LinkedGov.moveColumn(colName, "left", function() {
						Refine.update({
							modelsChanged : true
						});
					});
					break;
				case "move-right":
					LinkedGov.moveColumn(colName, "right", function() {
						Refine.update({
							modelsChanged : true
						});
					});
					break;
				case "hide":
					
					ui.dataTableView._collapsedColumnNames[colName] = true;
					ui.dataTableView.render();		
					
					Refine.update({
						modelsChanged : true
					});
					
					break;
				case "delete-rdf":
					LinkedGov.removeColumnInRDF(colName, function() {
						Refine.update({
							modelsChanged : true
						});
					});
					break;
				default:
					break;

				}

			});

		},

		/*
		 * injectWizardProgressOverlay
		 * 
		 * Appends the wizard to the project page body,
		 */
		injectWizardProgressOverlay : function() {
			$("body").append(
					"<div class='wizardProgressMessage'>" +
					"<div class='overlay'><!-- --></div>" +
					"<p>Wizard in progress...<img src='images/large-spinner.gif' /></p>" +
					"</div>");
		},

		/*
		 * showWizardProgress
		 * 
		 * Shows or hides the wizard progress message.
		 */
		showWizardProgress : function(show) {
			if (show) {
				$('div.wizardProgressMessage').show();
				$("body").addClass("wizard-progress");
			} else {
				$('div.wizardProgressMessage').hide();
				$("body").removeClass("wizard-progress");
			}
		},

		/*
		 * resizeAll_LG
		 *  
		 * The top-level resizeAll function doesn't resize our typing panel, so we
		 * need to include the typing panel's resize function in this function.
		 * 
		 * This function is bound to the $(window).resize() function in the
		 * $(document).ready block at the end of this file.
		 */
		resizeAll_LG : function() {

			/*
			 * Call the old resizeAll function - found in the core project.js file.
			 */
			resizeAll();
		},
		
		/*
		 * showUndoButton
		 */
		showUndoButton : function(wizardBody) {
			$(wizardBody).parent().find("div.action-buttons a.undo").css("display","inline-block");
		},

		/*
		 * resetWizard
		 * 
		 * Called once a wizard is complete.
		 * 
		 * Takes a wizard's body HTML element as a parameter and resets it's options
		 * and settings.
		 */
		resetWizard : function(wizardBody) {

			// Clear checkboxes
			$(wizardBody).find(":input").removeAttr('checked').removeAttr('selected');
			// Clear column selections
			$(wizardBody).find("ul.selected-columns").html("").hide();
			// Clear text fields
			$(wizardBody).find(":text").val("");

			// Make sure the wizard is displayed so the user can repeat the
			// task if they wish
			// TODO: Don't need these any more
			$("a.wizard-header").removeClass("exp");
			$(wizardBody).prev("a.wizard-header").addClass("exp");
			$("div.wizard-body").hide();
			$(wizardBody).show();

			// Display the typing panel
			ui.leftPanelTabs.tabs({
				selected : 1
			});

			return false;

		},

		/*
		 * silentProcessCall
		 * 
		 * Performs an AJAX call to a Refine process without incurring a UI update
		 * unless specified in the callback.
		 * 
		 * This is helpful when stringing together lots of process calls at once,
		 * where only one UI update is needed to reflect the changes made in the
		 * table.
		 * 
		 * o = the ajax object
		 */
		silentProcessCall : function(o) {

			log("silentProcessCall");
			log(o);
			
			o.async = o.async || true;
			o.type = o.type || "POST";
			o.dataType = o.dataType || "json";
			o.url = o.url || "";
			o.data = o.data || "";
			o.success = o.success || {};
			o.error = o.error || {};

			o.data.project = theProject.id;
			o.data = $.param(o.data);

			$.ajax(o);

			return false;

		},

		/*
		 * loadHTMLCallback
		 * 
		 * Called each time HTML is loaded, either through LinkedGov or Refine.
		 */
		loadHTMLCallback : function(htmlPage) {

			/*
			 * Strip the HTML location down to it's name
			 */
			htmlPage = htmlPage.split("/");
			htmlPage = htmlPage[htmlPage.length - 1];
			var pageName = htmlPage.replace(".html", "");

			switch (pageName) {

			case 'typing-panel':
				// Inject LinkedGov's Typing panel JS into the page
				$.getScript(ModuleWirings["linkedgov"] + 'scripts/project/typing-panel.js');
				break;

			default:
				break;
			}

			return false;
		},
		
		/*
		 * Formats and returns a string in camel case.
		 */
		camelize : function(str) {

			//log("Camelizing: ")
			//log(str);
			
		    return str
	        .replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
	        .replace(/\s/g, '')
	        .replace(/^(.)/, function($1) { return $1.toLowerCase(); });

		}

};

/*
 * DOM.loadHTML
 * 
 * An overriding function that allows a callback function to be called on the
 * success of any HTML injection.
 * 
 * Overriding the main DOM.loadHTML function allows us to inject our own JS
 * whenever Refine injects HTML.
 */
DOM.loadHTML = function(module, path, callback) {

	callback = callback || function() {
	};

	if (path == "") {
		module = "linkedgov";
		path = "";
	}
	var fullPath = ModuleWirings[module] + path;
	if (!(fullPath in DOM._loadedHTML)) {
		$.ajax({
			async : false,
			url : fullPath,
			dataType : "html",
			success : function(html) {
				DOM._loadedHTML[fullPath] = html;
				LinkedGov.loadHTMLCallback(fullPath);
				callback();
			}
		});
	} else {
		callback();
	}
	return DOM._loadedHTML[fullPath];
};

/*
 * GenerateId - returns a unique id.
 * 
 * Used for creating jQuery UI's Datepickers for selected
 * date columns.
 */
$.generateId = function() {
	return arguments.callee.prefix + arguments.callee.count++;
};
$.generateId.prefix = 'id-';
$.generateId.count = 0;
$.fn.generateId = function() {
	return this.each(function() {
		this.id = $.generateId();
	});
};

/*
 * A degradable logging function - can be 
 * turned on and off using LinkedGov.vars.debug.
 */
function log(str) {
	window.console && console.log && LinkedGov.vars.debug && console.log(str);
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function() {
	
	LinkedGov.initialise();
	
});