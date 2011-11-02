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
			lgNameSpace: "http://example.linkedgov.org/"
		},

		/*
		 * initialise
		 * 
		 * Initial styling and injections
		 */
		initialise : function() {

			
			$.ajax({
				type : "GET",
				url : "/command/" + "core" + "/" + "get-project-metadata?project="+theProject.id,
				data : $.param({}),
				success : function(data) {
					console.log(data);
				},
				error : function() {
					
				}
			});
			
			this.restyle();
			this.injectTypingPanel();
			this.injectWizardProgressOverlay();
			this.quickTools();
			
			/*
			 * Load the wizard scripts
			 */
			$.getScript("extension/linkedgov/scripts/project/address-wizard.js",function(){
				LinkedGov.addressWizard = addressWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/datetime-wizard.js",function(){
				LinkedGov.dateTimeWizard = dateTimeWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/latlong-wizard.js",function(){
				LinkedGov.latLongWizard = latLongWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/measurements-wizard.js",function(){
				LinkedGov.measurementsWizard = measurementsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/multiplecolumns-wizard.js",function(){
				LinkedGov.multipleColumnsWizard = multipleColumnsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/multiplevalues-wizard.js",function(){
				LinkedGov.multipleValuesWizard = multipleValuesWizard;
			});
			
			/*
			 * Load the refine operations script
			 */
			$.getScript("extension/linkedgov/scripts/project/refine-operations.js",function(){
				LinkedGov.splitVariablePartColumn = splitVariablePartColumn;
			});
			
			/*
			 * Load our custom save-rdf operations script
			 */
			$.getScript("extension/linkedgov/scripts/project/save-rdf.js",function(){
				LinkedGov.renameColumnInRDF = renameColumnInRDF;
				LinkedGov.finaliseRDFSchema = finaliseRDFSchema;
				LinkedGov.applyTypeIcons = applyTypeIcons;
				LinkedGov.applyTypeIcons.init();
				LinkedGov.applyTypeIcons.apply();
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
						if (!$(this).hasClass("ui-selectee")) {
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
			
			return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
				if (+match === 0)
					return ""; // or if (/\s+/.test(match)) for white spaces
				return index == 0 ? match.toLowerCase() : match.toUpperCase();
			});

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