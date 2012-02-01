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
var LG = {};

/*
 * Global variables used across multiple wizards
 */
LG.vars = {
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
		hiddenColumns: "",
		reconServices : [{
			name:"UK Government departments",
			keywords:["department","organisation"],
			endpoint:"http://services.data.gov.uk/reference/sparql",
			labelProperty:"http://www.w3.org/2000/01/rdf-schema#label"
		}]
};


/*
 * initialise
 * 
 * Initial styling and injections
 */
LG.initialise = function() {

	/*
	 * Perform quick style changes
	 */
	$("#app-home-button").remove();
	this.restyle();

	/*
	 * Load scripts
	 */
	this.loadPanelScripts();
	this.loadOperationScripts();

	/*
	 * Load HTML specific to the project page
	 */
	this.injectWizardProgressOverlay();
	this.injectFeedbackForm();

	/*
	 * Initialise misceallaneous functions
	 */
	this.addUnhideColumnButton();
	this.quickTools();

};

/*
 * A home for the panels
 */
LG.panels = {};

/*
 * A home for the wizards
 */
LG.wizards = {};

/*
 * A home for the generic operations used by the wizards
 */
LG.ops = {};


/*
 * injectTypingPanel
 * 
 * Injects the Typing panel HTML and JS into the page
 */
LG.loadTypingPanel = function(callback) {

	// Create the Typing tab
	$(".refine-tabs ul li").eq(0).after('<li><a href="#refine-tabs-typing">Typing</a></li>');
	// Create the Typing panel div
	$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
	// Load LG's Typing panel HTML into the div
	$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/panels/typingPanel.html",function(){

		$.getScript("extension/linkedgov/scripts/project/panels/typingPanel.js",function(){
			var interval = setInterval(function(){
				if(typeof ui != 'undefined'){

					log("here");
					ui.typingPanel = new TypingPanel($("div#refine-tabs-typing"));
					log("here2");
					LG.panels.typingPanel = ui.typingPanel;
					log("here3");
					log(ui.typingPanel);

					clearInterval(interval);

					if(callback){
						callback();
					}

				} else {
					log("ui object is not ready yet");
				}
			},100)
		});	
	}));
};

/*
 * loadPanelScripts
 * 
 * Loads scripts for each of the panels
 */
LG.loadPanelScripts = function() {

	LG.loadTypingPanel(function(){

		var interval = setInterval(function(){

			if(typeof ui.typingPanel != 'undefined' && typeof ui.leftPanelTabs != 'undefined'){

				/*
				 * Load the wizards panel script
				 */
				$.getScript("extension/linkedgov/scripts/project/panels/wizardsPanel.js",function(){
					LG.panels.wizardsPanel = LinkedGov_WizardsPanel;
					LG.panels.wizardsPanel.loadWizardScripts();
					LG.panels.wizardsPanel.loadHTML();
					LG.panels.wizardsPanel.initialise();
				});

				/*
				 * Load the linking panel script
				 */
				$.getScript("extension/linkedgov/scripts/project/panels/linkingPanel.js",function(){
					LG.panels.linkingPanel = LinkedGov_LinkingPanel;
					LG.panels.linkingPanel.loadHTML();
					LG.panels.linkingPanel.initialise();
				});

				/*
				 * Load the labelling panel script
				 */
				$.getScript("extension/linkedgov/scripts/project/panels/labellingPanel.js",function(){
					LG.panels.labellingPanel = LinkedGov_LabellingPanel;
					LG.panels.labellingPanel.loadHTML();
					LG.panels.labellingPanel.initialise();
				});

				/*
				 * Rebind the tabs resize functions when selecting the tab - 
				 * adding in our own.
				 */
				ui.leftPanelTabs.unbind('tabsshow');
				ui.leftPanelTabs.bind('tabsshow', function (event, tabs) {
					if (tabs.index === 0) {
						ui.browsingEngine.resize();
					} else if (tabs.index === 1) {
						ui.typingPanel.resize();
					} else if (tabs.index === 2) {
						ui.historyPanel.resize();
					}
				});

				/*
				 * Switch to index 1 - where the "Typing" tab is located.
				 */
				$("div#left-panel div.refine-tabs").tabs('select', 1);
				$("div#left-panel div.refine-tabs").css("visibility", "visible");

				/*
				 * Bind our own resize function to the window
				 */
				$(window).unbind("resize");
				$(window).bind("resize", LG.resizeAll_LG);

				clearInterval(interval);

			} else {
				log("ui.typingPanel || ui.leftPanelTabs ain't ready yet...");
				if(typeof ui.typingPanel == 'undefined'){
					ui.typingPanel = new TypingPanel($("div#refine-tabs-typing"));
					LG.panels.typingPanel = ui.typingPanel;
				}
			}

		},100);

	})

};

/*
 * loadOperationScripts
 * 
 * Loads the operation scripts
 */
LG.loadOperationScripts = function(){

	/*
	 * Load the general operations script
	 */
	$.getScript("extension/linkedgov/scripts/project/generalOperations.js",function(){
		LG.ops = LinkedGov_generalOperations;

		/*
		 * Load the rdf-operations script once the refine-operations script has 
		 * successfully loaded
		 */
		$.getScript("extension/linkedgov/scripts/project/rdfOperations.js",function(){
			LG.rdfOps = LinkedGov_rdfOperations;

			LG.rdfOps.applyTypeIcons.init();
			LG.rdfOps.applyTypeIcons.apply();		

			/*
			 * Load the project's hidden columns from the 
			 * metadata file - hide any columns if there are 
			 * some present.
			 */
			LG.ops.getHiddenColumnMetadata(function(){
				LG.ops.keepHiddenColumnsHidden();
			});

			/*
			 * Overwrite Refine's data table "render" function, 
			 * so we can include a couple of our functions that 
			 * need to be called every time the table is updated.
			 */
			ui.dataTableView.render2 = ui.dataTableView.render;
			ui.dataTableView.render = function(){

				//log("Rendered table");
				ui.dataTableView.render2();
				LG.ops.keepHiddenColumnsHidden();
				LG.rdfOps.applyTypeIcons.apply();
				$(window).resize();
			}

			/*
			 * Perform a generic update once everything has loaded
			 */
			Refine.update({everythingChanged:true});

		});
	});


};

/*
 * restyle
 * 
 * Any major initial restyling
 */
LG.restyle = function() {
	/*
	 * Giving the body our own class applies our CSS rules.
	 */
	$("body").addClass("lg");

	$("#header").html('<img width="129" height="40" alt="Google Refine" src="/extension/linkedgov/images/logo-small.png"><span id="slogan">Making government data usable</span>'+$("#header").html());

	$("body").append("<div id='beta'><p>Alpha</p></div>");
	$("#project-controls").css("margin-right","100px");
	$("#extension-bar").css("margin-right","45px");
};

/*
 * injectFeedbackForm
 * 
 * Injects the feedback form in the top right of the page
 */
LG.injectFeedbackForm = function() {

	$.get("/extension/linkedgov/scripts/feedback.js",function(){
		$("div#project-controls").append('<a class="button" id="send-feedback" href="#" title="Send feedback">Feedback</a>');				
	});

};


/*
 * showFinishMessage
 * 
 * Displays the thank you message to users once they've sent their
 * data off to the LG database.
 */
LG.showFinishMessage = function(){

	var finishMessage = DialogSystem.createDialog();
	$(finishMessage).width(500);
	var header = $('<div></div>').addClass("dialog-header").text("Thanks!").appendTo(finishMessage);
	var body = $('<div></div>').addClass("dialog-body").addClass("finish-message").appendTo(finishMessage);
	var footer = $('<div></div>').addClass("dialog-footer").appendTo(finishMessage);

	$(body).html(
			"<p>This data is now stored inside LG's database.</p>" +
			"<h3>What next?</h3>" +
			"<p>If there are any errors, unexpected values - or work that still " +
			"needs doing within the data - these will be used to create tasks for people " +
			"to complete using their expertise and judgement.</p>" +
			"<p>For any of the cleaning tasks that were completed, the data is now potentially linkable " +
			"to other datasets and more accessible to users searching for those particular data " +
			"types.</p>" +
			"<p>Well done. This data is now miles better than it was.</p>"
	);

	$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function() {
		DialogSystem.dismissAll();	
	}).appendTo(footer);

	DialogSystem.showDialog(finishMessage);

};

/*
 * addUnhideColumnButton
 * 
 * Injects the HTML & a listener for the "Unhide" columns button
 */
LG.addUnhideColumnButton = function() {

	var self = this;

	$("div#project-controls").prepend('<a id="unhide-columns-button" title="Unhide columns" class="button">Unhide columns</a>');
	$("a#unhide-columns-button").live("click",function(){
		LG.vars.hiddenColumns = "";
		LG.ops.eraseHiddenColumnData();
		LG.ops.keepHiddenColumnsHidden();
		Refine.update({modelsChanged:true});
		LG.showHideUnhideColumnButton("hide");
	});

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
};

/*
 * showHideUnhideColumnButton
 */
LG.showHideUnhideColumnButton = function(showHide){
	(showHide == "show" ? $("a#unhide-columns-button").css("display","inline-block") : $("a#unhide-columns-button").hide());
};

/*
 * updateUnhideColumnButton
 */
LG.updateUnhideColumnButton = function(count){
	var self = this;
	if(count > 0){
		var str = "Unhide "+count+" column"+(count == 1 ? "" : "s");
		$("a#unhide-columns-button").html(str).attr("title",str);
		LG.showHideUnhideColumnButton("show");
	} else{
		LG.showHideUnhideColumnButton("hide");
	}
};


/*
 * quickTools
 * 
 * Initialises the quick tools for column headings.
 */
LG.quickTools = function() {

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
			var name = window.prompt("Name:", colName) || "";
			if (name.trim().length > 0) {
				LG.ops.renameColumn(colName, name, function() {
					Refine.update({
						modelsChanged : true
					});
				});
			} else {
				alert("Not a valid column name.");
			}
			break;
		case "remove":
			LG.ops.removeColumn(colName, function() {
				Refine.update({
					modelsChanged : true
				});
			});
			break;
		case "move-left":
			LG.ops.moveColumn(colName, "left", function() {
				Refine.update({
					modelsChanged : true
				});
			});
			break;
		case "move-right":
			LG.ops.moveColumn(colName, "right", function() {
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
			LG.rdfOps.removeColumnInRDF(colName, function() {
				Refine.update({
					modelsChanged : true
				});
			});
			break;
		default:
			break;

		}

	});

};

/*
 * exposeColumnHeaders
 * 
 * Applies a mask of opacity to elements that leave the column headers exposed.
 * 
 * 'expose' is a boolean - true to mask, false to restore the mask.
 */
LG.exposeColumnHeaders = function(expose){

	var opacity = 1;

	if(expose){
		opacity = 0.4;
		$("table.data-table").find("td").addClass("mask");
	} else {
		opacity = 1;
		$("table.data-table").find("td").removeClass("mask");
	}

	/*
	 * Elements to mask/restore
	 */
	$(".wizard-body").children().css("opacity",opacity);
	//$("table.data-table").css("opacity",opacity);

	$("div.viewpanel-header").css("opacity",opacity);
	$("div.action-buttons").css("opacity",opacity);
	$("div.cancel-button").css("opacity",opacity);
	$("div#tool-panel").css("opacity",opacity);
	$("div#header").css("opacity",opacity);
	$("ul.ui-tabs-nav").css("opacity",opacity);
	$("td.column-header").eq(0).css("opacity",opacity);

	/*
	 * Elements to expose
	 */
	$("div.selector").css("opacity","1");


};

/*
 * getColumnHeaderElement
 * 
 * Returns the matching column header element given a column name
 */
LG.getColumnHeaderElement = function(colName){

	var colHeaders = ui.dataTableView._columnHeaderUIs;
	for(var i=0, len=colHeaders.length; i<len; i++){
		if(colHeaders[i]._column.name == colName){
			return colHeaders[i]._td;
		}
	}

};

/*
 * Adds the "mask" class to the column cells
 */
LG.selectColumn = function(colName){

	$("table.data-table tbody").children("tr").each(function(){
		for(var i=0;i<$(this).children("td").length;i++){
			if(i == Refine.columnNameToColumnIndex(colName)+3){
				$(this).children("td").eq(i).removeClass("mask");
			}
		}
	});

	return false;
};

/*
 * Removes the "mask" class from the column cells
 */
LG.deselectColumn = function(colName){

	$("table.data-table tbody").children("tr").each(function(){
		for(var i=0;i<$(this).children("td").length;i++){
			if(i == Refine.columnNameToColumnIndex(colName)+3){
				$(this).children("td").eq(i).addClass("mask");
			}
		}
	});

	return false;
};

/*
 * injectWizardProgressOverlay
 * 
 * Appends the wizard to the project page body,
 */
LG.injectWizardProgressOverlay = function() {
	$("body").append(
			"<div class='wizardProgressMessage'>" +
			"<div class='overlay'><!-- --></div>" +
			"<p>Wizard in progress...<img src='images/large-spinner.gif' /></p>" +
	"</div>");
};

/*
 * showWizardProgress
 * 
 * Shows or hides the wizard progress message.
 */
LG.showWizardProgress = function(show) {
	if (show) {
		$('div.wizardProgressMessage').show();
		$("body").addClass("wizard-progress");
	} else {
		$('div.wizardProgressMessage').hide();
		$("body").removeClass("wizard-progress");
	}
};

/*
 * resizeAll_LG
 *  
 * The top-level resizeAll function doesn't resize our typing panel, so we
 * need to include the typing panel's resize function in this function.
 * 
 * This function is bound to the $(window).resize() function in the
 * $(document).ready block at the end of this file.
 */
LG.resizeAll_LG = function() {

	/*
	 * Call the old resizeAll function - found in the core project.js file.
	 */
	resizeAll();
};

/*
 * addReconciliationServices
 */
LG.addReconciliationServices = function(index, serviceNameSuffix, callback){

	/*
		datasource	sparql
		graph	
		name	UK Government Departments
		properties	
		type	plain
		url	http://services.data.gov.uk/reference/sparql
	 */

	ReconciliationManager.standardServices.length = 0;
	ReconciliationManager.save(function(){

		$.post("/command/rdf-extension/addService",{
			"datasource":"sparql",
			"name":LG.vars.reconServices[index].name+(serviceNameSuffix == 1 ? "" : "-"+serviceNameSuffix),
			"url":LG.vars.reconServices[index].endpoint,
			"type":"plain",
			"graph":"",
			"properties":LG.vars.reconServices[index].labelProperty
		},
		function(data){
			if(typeof data.code != 'undefined' && data.code != 'error'){
				log("Successfully added service");
				/*
				 * Store the ID given to the service by the RDF extension 
				 * back into our service object
				 */
				LG.vars.reconServices[index].id = data.service.id;
				RdfReconciliationManager.registerService(data);
				if(index == LG.vars.reconServices.length-1){
					/*
					 * We've added all the services
					 */
					if(callback){
						callback();
					}
				} else {
					/*
					 * Proceed to add the next service
					 */
					LG.addReconciliationServices(index, serviceNameSuffix, callback);
				}
			} else {
				log("Error adding service");
				serviceNameSuffix = serviceNameSuffix+1;
				/*
				 * Add the same service again, but this time, adding an integer suffix to the end
				 * of it's name (to avoid a clash).
				 */
				LG.addReconciliationServices(index, serviceNameSuffix, callback);

			}
		},"json");
	});
};

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
LG.silentProcessCall = function(o) {

	//log("silentProcessCall");
	//log(o);

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

};

/*
 * NOT BEING USED? 
 * 
 * loadHTMLCallback
 * 
 * Called each time HTML is loaded, either through LG or Refine.
 */
LG.loadHTMLCallback = function(htmlPage) {

	/*
	 * Strip the HTML location down to it's name
	 */
	htmlPage = htmlPage.split("/");
	htmlPage = htmlPage[htmlPage.length - 1];
	var pageName = htmlPage.replace(".html", "");

	switch (pageName) {

	//case 'typing-panel':
	// Inject LinkedGov's Typing panel JS into the page
	//	$.getScript(ModuleWirings["LinkedGov"] + 'scripts/project/typing-panel.js');
	//	break;

	default:
		break;
	}

	return false;
};

/*
 * Formats and returns a string in camel case.
 * 
 * Removes and converts non-alpha characters so column names
 * can be used as RDF/XML properties without causing errors when parsing.
 */
LG.camelize = function(str) {

	//log("Camelizing: ")
	//log(str);

	return escape($("<div/>").html(str).text()
			.toLowerCase()
			.replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
			.replace(/\s/g, '')
			.replace(/^(.)/, function($1) { return $1.toLowerCase(); })
			.replace(/\)/g,"-")
			.replace(/\(/g,"-")
			//.replace(/=/g,"-equals-")
			.replace(/&/g,"and")
			//.replace(/:/g,"-")
			//.replace(/</g,"-less than-")
			//.replace(/>/g,"-more than-")
			.replace(/_/g,"-"));

};


/*
 * DecodeHTMLEntity
 * 
 * Decodes HTML entities like &amp; and &apos; 
 */
LG.decodeHTMLEntity = function(str){
	return $("<div/>").html(str).text();
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
				LG.loadHTMLCallback(fullPath);
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
 * turned on and off using LG.vars.debug.
 */
function log(str) {
	window.console && console.log && LG.vars.debug && console.log(str);
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function() {

	LG.initialise();

});