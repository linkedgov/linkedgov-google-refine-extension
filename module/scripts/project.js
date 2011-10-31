/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The global LinkedGov object for the Project page.
 * 
 * Contents:
 * - Global variables (debug on / off)
 * - Initialisation functions
 * - Initial injection functions
 * - General data operations (set blank cells to null)
 * - Individual wizard operations
 * 
 * Wizards names:
 * 
 * - multipleColumnsWizard
 * - multipleValuesWizard
 * - dateTimeWizard
 * - measurementsWizard
 * - addressWizard
 * - latLongWizard
 * 
 * Notes:
 * 
 * When posting one of Refine's core process operations using 
 * Refine.postCoreProcess() - a number of UI updates is usually 
 * bundled with it as the expected behaviour is for Refine to 
 * perform a core process with gaps for user input in between. This 
 * isn't the case for the LinkedGov skin as a series of operations are 
 * often strung together and executed rapidly, resulting in flashes of
 * "updating" and "working" messages while operations are performed. To 
 * avoid this, the function call is skipped when possible and replaced 
 * using a more silent AJAX call with LinkedGov.silentProcessCall function, 
 * which doesn't carry with it any of Refine's UI update functions. This 
 * replacement has to be used carefully though as some operations rely on 
 * previous updates being made (i.e. row-removals and row/column transposes 
 * require the data-table to be updated otherwise successive operations 
 * will fail to realise the old rows/columns have been changed).
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
			$(".refine-tabs ul li").eq(0).after(
			'<li><a href="#refine-tabs-typing">Typing</a></li>');
			// Create the Typing panel div
			$("div.refine-tabs")
			.append(
			'<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			// Load LinkedGov's Typing panel HTML into the div
			$("div#refine-tabs-typing").html(
					DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));

			$(window).unbind("resize");
			$(window).bind("resize", LinkedGov.resizeAll_LG);

		},

		/*
		 * Initialises the quick tools for column headings.
		 */
		quickTools : function() {

			/*
			 * Quick tools TODO: Show & hide using CSS.
			 */
			$("td.column-header").live(
					"hover",
					function() {
						// if doesn't have a quick tool
						// then insert
						// else show or hide
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
			$("body")
			.append(
			"<div class='wizardProgressMessage'><div class='overlay'><!-- --></div><p>Wizard in progress...<img src='images/large-spinner.gif' /></p></div>");
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
		 * 
		 * resizeAll
		 * 
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
			/*
			 * Call our additional resize functions.
			 */

			/*
			 * TODO: Use this CSS instead of a JS resize: bottom: 0; height: auto
			 * !important; top: 28px;
			 */
			// ui.typingPanel.resize();
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
			$(wizardBody).find(":input").removeAttr('checked').removeAttr(
			'selected');
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

			// Scroll the top of the wizard into view.
			// $(wizardBody).parent().scrollTop($(wizardBody).prev("a.wizard-header").offset().top)

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

			// log(htmlPage+" has been loaded");
			/*
			 * Strip the HTML location down to it's name
			 */
			htmlPage = htmlPage.split("/");
			htmlPage = htmlPage[htmlPage.length - 1];
			var pageName = htmlPage.replace(".html", "");

			switch (pageName) {

			case 'typing-panel':
				// Inject LinkedGov's Typing panel JS into the page
				$.getScript(ModuleWirings["linkedgov"]
				+ 'scripts/project/typing-panel.js');
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
 * generateId - returns a unique id.
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

function log(str) {
	window.console && console.log && LinkedGov.vars.debug && console.log(str);
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function() {
	LinkedGov.initialise();
});