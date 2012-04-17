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
		lastScrollLeft: 0,
		rdfSchema : {
			prefixes : [],
			baseUri : "http://data.linkedgov.org/dataset/"+theProject.id+"/",
			rootNodes : []
		},
		labelsAndDescriptions : {
			rowLabel : "Each row is a...",
			rowDescription : "Enter a description...",
			rowStatus: "bad",
			cols : []
		},
		lgNameSpace: "http://data.linkedgov.org/",
		projectURI:"http://data.linkedgov.org/dataset/"+theProject.id+"/",
		lgClassURI: "http://data.linkedgov.org/terms/class/"+theProject.id+"/",
		lgPropertyURI: "http://data.linkedgov.org/terms/property/"+theProject.id+"/",
		hiddenColumns: "",
		reconServices : []
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
			// There are timing issues surrounding the creation of the typing panel
			var interval = setInterval(function(){
				// Wait until the "ui" object is definitely created
				if(typeof ui != 'undefined'){
					// Create our own "typingPanel" object inside Refine's "ui" object
					ui.typingPanel = new TypingPanel($("div#refine-tabs-typing"));
					// Store the typing panel so it's accessible by the other panels
					LG.panels.typingPanel = ui.typingPanel;

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
					LG.panels.wizardsPanel.initialise();
					LG.panels.wizardsPanel.displayPanel();

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


			/*
			 * Overwrite Refine's data-table "render" function, 
			 * so we can include our functions that 
			 * need to be called every time the table UI is updated.
			 */
			var interval = setInterval(function(){

				/*
				 * Make sure two of Refine's core UI objects are created before proceeding
				 */
				if(typeof ui.dataTableView != 'undefined' 
					&& typeof theProject.columnModel != 'undefined' 
						&& typeof theProject.rowModel != 'undefined'){
					
					LG.rdfOps = LinkedGov_rdfOperations;
					LG.rdfOps.applyTypeIcons.init();
					LG.rdfOps.applyTypeIcons.apply();		
					LG.detectColumnsOfNumbers();

					ui.dataTableView.render2 = ui.dataTableView.render;
					ui.dataTableView.render = function(){
						// Let Refine re-render the table
						ui.dataTableView.render2();
						// Re-apply the RDF indicators
						//LG.rdfOps.applyTypeIcons.apply();
						// Keep any hidden columns hidden
						LG.ops.keepHiddenColumnsHidden();
						// Whenever Refine updates the data table, it removes the classes from the table 
						// header - which destroys our RDF symbols
						LG.rdfOps.applyTypeIcons.apply();				
						// Reinject column quick-tool
						LG.injectQuickTool();
						// Perform a window resize
						// Sometimes, Refine hasn't loaded fully at this point, 
						// so we can catch a resize-related JS error here
						LG.applyMode();
						try {
							$(window).resize();
						} catch (e) {
							log(e);
						}
					}

					/*
					 * Save the base URI for the project
					 */
					LG.rdfOps.saveBaseUri(LG.vars.rdfSchema.baseUri);

					/*
					 * Perform a generic update once everything has loaded
					 * so that the table doesn't get re-rendered, which in turn 
					 * destroys anything we've added to the data table.
					 */
					Refine.update({everythingChanged:true}, function(){
						/*
						 * These functions need to be called once everything has rendered
						 */

						/*
						 * Load the project's hidden columns from the 
						 * metadata file - hide any columns if there are 
						 * some present and add the button to unhide the columns.
						 */
						LG.ops.getHiddenColumnMetadata(function(){
							LG.ops.keepHiddenColumnsHidden();
							LG.addUnhideColumnButton();
							LG.setupQuickTool();
							LG.setupModeButton();
							$("div.loading-message").hide();
							$(window).resize();
						});

					});

					clearInterval(interval);

				} else {
					log("ui.dataTableView not ready");
				}

			},100);

		});
	});
};


/*
 * detectColumnsOfNumbers
 * 
 * Scans the columns to see if any of them contain 
 * numbers that are falsely being stored as strings.
 * This often happens when figures are imported with commas
 * in (e.g 3,241).
 * 
 */
LG.detectColumnsOfNumbers = function(callback){
		
	var columnsContainingNumbers = [];

	// Loop through the columns and compute facets using a regex
	var columns = theProject.columnModel.columns;	
	var expression = "if(not(isNull(value.match(/^\\$?\\-?([1-9]{1}[0-9]{0,2}(\\,\\d{3})*(\\.\\d{0,2})?|[1-9]{1}\\d{0,}(\\.\\d{0,2})?|0(\\.\\d{0,2})?|(\\.\\d{1,2}))$|^\\-?\\$?([1-9]{1}\\d{0,2}(\\,\\d{3})*(\\.\\d{0,2})?|[1-9]{1}\\d{0,}(\\.\\d{0,2})?|0(\\.\\d{0,2})?|(\\.\\d{1,2}))$|^\\(\\$?([1-9]{1}\\d{0,2}(\\,\\d{3})*(\\.\\d{0,2})?|[1-9]{1}\\d{0,}(\\.\\d{0,2})?|0(\\.\\d{0,2})?|(\\.\\d{1,2}))\\)$/)[0])),'number',if(isError(value.toNumber()),'string','number'))";
	// To paste into Refine:
	// if(not(isNull(value.match(/^\$?\-?([1-9]{1}[0-9]{0,2}(\,\d{3})*(\.\d{0,2})?|[1-9]{1}\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))$|^\-?\$?([1-9]{1}\d{0,2}(\,\d{3})*(\.\d{0,2})?|[1-9]{1}\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))$|^\(\$?([1-9]{1}\d{0,2}(\,\\d{3})*(\.\d{0,2})?|[1-9]{1}\\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))\)$/)[0])),'number',if(isError(value.toNumber()),'string','number'))
	for(var i=0; i<columns.length; i++){
		LG.ops.computeColumnFacet(columns[i].name, expression, function(data){
			// Loop through the facets
			for ( var j = 0; j < data.facets.length; j++) {

				// If the facet matches the column name,
				// is not either of the reconciliation facets - 
				// and has choices returned
				if (data.facets[j].columnName == columns[i].name 
						&& typeof data.facets[j].choices != 'undefined') {
					
					// Check to see that the "number" value occurs at least 90% of the time
					// var safetyPoint = theProject.rowModel.total * 0.9;
					// TODO: Revise the safety point - 100% is safe, if one value out of 1000 is wrong, 
					// the column won't get converted.
					// Check to see that the "number" value occurs at least 100% of the time
					var safetyPoint = theProject.rowModel.total * 1;					
					
					for(var k=0; k<data.facets[j].choices.length ;k++){
						if(data.facets[j].choices[k].v.l == "number" && data.facets[j].choices[k].c >= safetyPoint){
							columnsContainingNumbers.push(columns[i].name);
						}
					}	
				}
				
				if(j == data.facets.length-1 && i == columns.length-1){
					LG.transformColumnsToNumber(columnsContainingNumbers, callback);
				}
			}
		});
	}
};

/*
 * transformColumnsToNumber
 * 
 * Once it's found a column that passes the test (a facet count of 
 * a regex test), we transform the values in the cells and type 
 * the column toNumber().
 */
LG.transformColumnsToNumber = function(columnNames, callback){
		
	for(var i=0; i<columnNames.length; i++){
				
		// Transform the column values by stripping out any commas
		// and converting them toNumber() using a single GREL expression

		LG.silentProcessCall({
			type: "POST",
			url : "/command/" + "core" + "/" + "text-transform",
			data:{
				columnName: columnNames[i],
				expression: 'grel:value.replace(",","").toNumber()',
				onError: "keep-original",
				repeat: false,
				repeatCount: 10
			},
			success:function(data){
				//
				if(i == columnNames.length-1){
					callback();
				}
			},
			error:function(){
				LG.alert("A problem was encountered when performing a text-transform on the column: \"" + columnNames[i] + "\".");
			}
		})		
	}
	
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
		var button = $("<a />")
		.addClass("button")
		.attr("id","send-feedback")
		.attr("href","#")
		.attr("title", "Send feedback")
		.text("Feedback");

		$("div#project-controls").prepend(button);
	});

};

/*
 * setupExpertButton
 * 
 * Hides/shows various buttons and tabs to create 
 * "basic" and "expert" modes for Google Refine.
 */
LG.setupModeButton = function(){

	// Create the toggle button
	var button = $("<a />")
	.addClass("button")
	.attr("id","expert-mode")
	.attr("href","#")
	.attr("title", "Switch to expert mode")
	.text("Expert mode");

	button.toggle(function(){	
		// Enter EXPERT mode
		LG.switchMode("expert");
	}, function(){
		// Enter BASIC mode
		LG.switchMode("basic");
	});

	// Add the button to the project controls area in the 
	// top right
	$("div#project-controls").prepend(button);

	// Initially hide the buttons and tabs 
	// to enter "basic" mode.
	LG.switchMode("basic");	
};

LG.applyMode = function(){

	var display = "inline-block";
	var columnHeaderNameMarginLeft = "20px";
	var pageSizeLeft = "180px";

	if(LG.vars.mode == "basic"){
		display = "none";
		columnHeaderNameMarginLeft = "2px";
		pageSizeLeft = "7px";
	}

	// Show/hide the column quick tool
	$("div.quick-tool").css("visibility", (display == "none" ? "hidden" : "visible"));

	// Show/hide the column menu buttons
	$("a.column-header-menu").css("display", display);
	$("span.column-header-name").css("margin-left", columnHeaderNameMarginLeft);

	// Hide "Show records" link
	$("div.viewpanel-rowrecord").css("display", (display == "inline-block" ? "block" : "none"));
	$("div.viewpanel-pagesize").css("left", pageSizeLeft);

	// Show/hide edit link in cells	
	$("a.data-table-cell-edit").css("display", display);

};

LG.switchMode = function(mode){

	LG.vars.mode = mode;

	// Expert mode settings
	var h2Top = "92px";
	var typingPanelBodyTop = "70px";
	var columnHeaderNameMarginLeft = "20px";
	var display = "inline-block";
	var buttonText = "Basic mode";
	var buttonTitle = "Switch to basic mode";
	var pageSizeLeft = "180px";

	if(mode == "basic"){
		// Basic mode settings
		h2Top = "60px";
		typingPanelBodyTop = "37px";
		columnHeaderNameMarginLeft = "0px";
		pageSizeLeft = "7px";
		display = "none";
		buttonText = "Expert mode";
		buttonTitle = "Switch to expert mode";
	}

	// Sometimes Refine hasn't created the tabs 
	// at the point that we do this. So we can catch
	// that JS error
	try{
		// Make sure the Typing panel is showing before we switch
		$("a[href='#refine-tabs-typing']").click();
	} catch(e){
		log(e);
	}

	// Show/hide the column quick tool
	$("div.quick-tool").css("visibility", (display == "none" ? "hidden" : "visible"));

	// Show left pane tabs & bodies
	$("div.typing-panel-body h2").css("top", h2Top);
	$("div.typing-panel-body").css("top", typingPanelBodyTop);

	// Show the column menu buttons
	$("a.column-header-menu").css("display", display);
	$("span.column-header-name").css("margin-left", columnHeaderNameMarginLeft);

	// Show Control buttons
	$("div#project-controls a").css("display", display);
	$("div#project-controls a#send-feedback").css("display", "inline-block");
	$("div#project-controls a#expert-mode").css("display", "inline-block");

	if($("div#project-controls a#unhide-columns-button").text() != "Unhide columns"){
		$("div#project-controls a#unhide-columns-button").css("display", "inline-block");
	} else {
		$("div#project-controls a#unhide-columns-button").css("display", "none");
	}

	// Hide "Show records" link
	$("div.viewpanel-rowrecord").css("display", (display == "inline-block" ? "block" : "none"));
	$("div.viewpanel-pagesize").css("left", pageSizeLeft);

	// Show extension buttons
	$("div#extension-bar").css("display", display);
	// Show edit link in cells	
	$("a.data-table-cell-edit").css("display", display);
	// Change button text
	$("a#expert-mode").text(buttonText).attr("title", buttonTitle);

};

/*
 * createDialog
 * 
 * Takes an object containing:
 * o.header = the header text for the dialog
 * o.body = the body text for the dialog
 * o.footer = the footer text 
 * o.buttons = a list of names and callbacks to create buttons
 * o.ok = callback for the ok button
 * o.cancel = callback for the cancel button
 * o.className = the className for custom styling
 */
LG.createDialog = function(o){

	if(!o.header || !o.body){
		return false;
	}

	var dialog = DialogSystem.createDialog();
	var header = $('<div></div>').addClass("dialog-header").append(o.header).appendTo(dialog);
	var body = $('<div></div>').addClass("dialog-body "+(o.className ? o.className : "")).append(o.body).appendTo(dialog);
	var footer = $('<div></div>').addClass("dialog-footer").append((o.footer ? o.footer : "")).appendTo(dialog);

	if(o.ok){
		if(typeof o.ok == "function"){
			log("Creating ok button with custom callback");
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(o.ok).appendTo(footer);
		} else {
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function(){
				DialogSystem.dismissAll();
			}).appendTo(footer);
		}
	}	
	if(o.cancel){
		if(typeof o.cancel == "function"){
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;Cancel&nbsp;&nbsp;").click(o.cancel).appendTo(footer);		
		} else {
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;Cancel&nbsp;&nbsp;").click(function(){
				DialogSystem.dismissAll();
			}).appendTo(footer);
		}
	}
	if(o.buttons){
		$.each(o.buttons, function(buttonName, callback){
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;"+buttonName+"&nbsp;&nbsp;").click(callback).appendTo(footer);					
		});
	}

	$(dialog).width(500);

	return dialog;

};

/*
 * A dialog box with a single input field.
 * 
 * Takes an object containing:
 * 
 * o.text = The message
 * o.value = A value to populate the input field with
 * o.ok = The OK button callback that's given the input field value
 * o.cancel = The Cancel button callback
 */
LG.prompt = function(o){
	
	var dialog = LG.createDialog({
		header:"We need something from you!",
		body:$("<p />").append($("<p />").text(o.text)).append($("<input type='text' />").addClass("prompt").val(o.value)),
		ok:function(){
			o.ok($("div.dialog-frame div.prompt").find("input.prompt").val());
		},
		cancel:function(){
			o.cancel();
		},
		className:"prompt"
	});
	DialogSystem.showDialog(dialog);
	$("div.prompt input.prompt").focus();
	$("div.dialog-container").center();
};

/*
 * A dialog that displays a text message 
 * to the user.
 */
LG.alert = function(s) {
	var dialog = LG.createDialog({
		header:"Oops!",
		body:$("<p />").append(s),
		ok:true,
		className:"alert"
	});
	DialogSystem.showDialog(dialog);
	$("div.dialog-container").center();
};

/*
 * handleJSError
 * 
 * In case of a JavaScript error, we need to return the page to a state 
 * where the user can progress regardless of their point in their journey.
 * - In a wizard
 * - On the linking panel
 * - On the labelling panel
 * 
 * TODO: Use the undo/redo history to rollback?
 */
LG.handleJSError = function(message) {

	var dialog = LG.createDialog({
		header:"Oops!",
		body:"<p>Something went wrong!</p>" +
		"<p class='error'>"+message+"</p>",
		buttons:{
			"OK":function(){
				log("Should log this error or send feedback...");
				DialogSystem.dismissAll();
			},
			"Refresh": function(){
				window.location = window.location;
			}
		},
		className:"jsError"
	});

	DialogSystem.showDialog(dialog);
	$("div.dialog-container").center();
	
	// Make sure the "Wizard in progress" message is hidden
	LG.showWizardProgress(false);
	// Find the active tab that's open
	if($("ul.lg-tabs li.active").length > 0){
		var panelName = $("div#"+$("ul.lg-tabs li.active").find("a").attr("rel")).attr("bind");
		// Make sure the body of the tab is displayed
		LG.panels[panelName].displayPanel();
	}
};

/*
 * An override for the browsers onError() function.
 * JS errors will now display inside a dialog box.
 */
onerror = function(o) {
	LG.handleJSError(o);
};

/*
 * showFinishMessage
 * 
 * Displays the thank you message to users once they've sent their
 * data off to the LG database.
 */
LG.showFinishMessage = function(){

	var header = "Thanks!";
	// Construct the HTML for the dialog body
	var body = 
		"<p>Well done! This data is much better than it was.</p>" + 
		"<p>People and machines will be able to understand more from it and find it easier to access it regardless of " +
		"their location in the world.</p>" + 
		"<p>This data is now stored inside LinkedGov's database - and is available through the <a href='#'>Question site</a> and " +
		"the <a href='#'>developer's search</a></p>" +
		"<h3>What next?</h3>" +
		"<p>If there are any errors, unexpected values - or work that still " +
		"needs doing within the data - these will be used to create tasks for others " +
		"to complete using their expertise and judgement.</p>" +
		"<p>Depending on the tasks that have been completed, the data is now potentially linkable " +
		"to other datasets and as a result - much more accessible to users searching for those particular data " +
		"types.</p>" +
		"<p><a href='#'>Bookmark</a> | <a href='#'>Tweet</a> | <a href='#'>Email</a></p>";

	// Create some buttons
	var footer = $('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function() {
		DialogSystem.dismissAll();	
	});

	// Create the dialog itself
	var dialog = LG.createDialog({
		header:header,
		body:body,
		footer:footer,
		className:"finish-message"
	});

	// Display the dialog
	DialogSystem.showDialog(dialog);

};

/*
 * addUnhideColumnButton
 * 
 * Injects the HTML & a listener for the "Unhide" columns button
 */
LG.addUnhideColumnButton = function() {

	var self = this;

	if(LG.vars.hiddenColumns.length < 1){
		$("div#project-controls").prepend('<a id="unhide-columns-button" title="Unhide '+LG.vars.hiddenColumns.split(",").length+' columns" class="button">Unhide columns</a>');
	} else {
		$("div#project-controls").prepend('<a id="unhide-columns-button" title="Unhide '+LG.vars.hiddenColumns.split(",").length+' columns" class="button">Unhide '+LG.vars.hiddenColumns.split(",").length+' columns</a>');		
		$("a#unhide-columns-button").css("display","inline-block");
	}

	$("a#unhide-columns-button").live("click",function(){
		LG.vars.hiddenColumns = "";
		LG.ops.eraseHiddenColumnData();
		LG.ops.keepHiddenColumnsHidden();
		Refine.update({modelsChanged:true});
		log("clicked unhide columns button, hidden cols = "+LG.vars.hiddenColumns);
		// It's important the text reverts back to "Unhide columns" 
		// once all columns have been unhidden as the switchMode function
		// uses the button text to decide whether to show it or not.
		$(this).text("Unhide columns").hide();
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
 * injectQuickTool
 * 
 * Each time the table re-renders, we lose our quick tool 
 * as we need to inject it into the HTML that gets re-injected by 
 * Refine.
 * 
 * We neeed to re-inject the quick tool each time the table is 
 * re-rendered.
 */
LG.injectQuickTool = function(){

	var div = $("<div />").addClass("quick-tool");	
	var ul = $("<ul />"); 

	$("<li />").addClass("rename").text("Rename").appendTo(ul);
	$("<li />").addClass("remove").text("Remove").appendTo(ul);
	$("<li />").addClass("move-left").text("Move left").appendTo(ul);
	$("<li />").addClass("move-right").text("Move right").appendTo(ul);
	$("<li />").addClass("hide").text("Hide").appendTo(ul);
	$("<li />").addClass("delete-rdf").text("Delete RDF").appendTo(ul);

	ul.appendTo(div);

	$("div.data-header-table-container").append(div);

};

/*
 * quickTools
 * 
 * Sets up interaction for the quick-tool pane
 */
LG.setupQuickTool = function() {

	$("td.column-header").live("hover", function() {

		if ($(this).find("span.column-header-name").length > 0 
				&& $(this).find("span.column-header-name").html() != "All") {

			$("div.quick-tool").data("colName", $(this).attr("title"));

			$("div.quick-tool").css("left", ($(this).offset().left+5)+"px").css("top", ($(this).offset().top+$(this).height()+3)+"px");
			if($(this).offset().left >= 300){
				$(".quick-tool").show();
			} else {
				$(".quick-tool").hide();
			}
		}
	});

	// When the user moves the cursor off the quick-tool, 
	// we want to hide it
	$("div.quick-tool").live("mouseleave", function(){
		$(this).hide();
	});

	$("div.data-header-table-container").live("mouseleave", function(){
		$("div.quick-tool").hide();
	});

	// If the user clicks the column headers menu icon, we want to hide
	// the quick tool
	$("div.column-header-title").live("click", function(){
		$("div.quick-tool").hide();
	});


	// Interaction for the quick tool options
	// Use the event object returned by jQUery to get the column name
	$("div.quick-tool li").live("click", function(e) {

		//var td = e.target.parentNode.parentNode.parentNode;
		var colName = $(this).parent("ul").parent("div").data("colName");

		switch ($(this).attr("class")) {

		case "rename":
			var name = window.prompt("Name:", colName) || "";
			if (name.trim().length > 2) {
				LG.ops.renameColumn(colName, name, function() {
					Refine.update({
						modelsChanged : true
					});
				});
			} else if(name.trim().length > 0){
				LG.alert("Column headers must be at least 3 characters long.");
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

		$("div.quick-tool").hide();

	});

	// Inject the quick tool HTML element into the table
	LG.injectQuickTool();

};

/*
 * setUpColumnOverlays
 * 
 * Creates overlays for the columns which are shown when 
 * hovering over columns when picking them.
 * 
 * Stores pointers to the overlay <divs> inside an associative 
 * array using the column name as the key.
 * 
 * E.g. self.vars.columnOverlays["Address 1"].div would return 
 * the overlay for that column 
 */
LG.buildColumnOverlays = function(selectedCallback, deselectedCallback){

	// Remove any existing column overlays
	LG.removeColumnOverlays();

	if($("body").hasClass("selecting-columns")){

		var self = this;

		// Start index at 1 because of the "All" header
		var index = 0;
		var divs = $("<div />");

		$("table.data-header-table tbody tr td.column-header").each(function(){

			// Skip adding an overlay for the "All" column
			if(index > 0){
				var el = $(this);
				var colName = $(this).attr("title");
				var div = $("<div/>")
				.addClass("column-overlay")
				.data("colName",colName)
				.data("leftPosition",el.offset().left)
				.data("td", el)
				.width(el.width()+10+1)
				.css("left",el.offset().left+"px")
				.css("top",el.offset().top+"px");

				if($("table.data-table")[0].scrollWidth > $("div#right-panel").width()
						&& $("table.data-table")[0].scrollHeight > $("div.data-table-container").height()){
					// Both scroll bars present
					div.height($("div.data-table-container").height()+el.height()-5);
				} else {
					div.height($("table.data-table").height()+el.height()+10);
				}

				divs.append(div);
			}
			index++;
		});

		$("body").append(divs.children());

		var startPosition = $("div.data-table-container").scrollLeft();

		$("div.data-table-container").unbind("scroll").bind("scroll",function() {

			var newPosition = $("div.data-table-container").scrollLeft();
			var scrollDifference = newPosition - startPosition;
			var headerTable = $("table.data-header-table");

			headerTable.css("left",-newPosition+"px");

			if($("body").hasClass("selecting-columns")){
				LG.repositionColumnOverlays(scrollDifference);
			}

		});

		LG.repositionColumnOverlays(0);
	}

	// We only reassign the click handlers for the column overlays 
	// if the cabllacks have been passed. The only time they are not 
	// passed is when the table is re-rendered or when the window is 
	// resized.
	if(selectedCallback && deselectedCallback){
		// Assign select and deselect listeners to the overylay div
		$("div.column-overlay").die("click").live("click", function(){
			if(!$(this).data("td").hasClass("selected")){
				$(this).data("td").addClass("selected");
				selectedCallback($(this).data("colName"));

			} else {
				$(this).data("td").removeClass("selected");
				deselectedCallback($(this).data("colName"));

			}
		});
	}
};

/*
 * repositionColumnOverlays
 * 
 * When the data table is scrolled, the column overlays misalign.
 * The only apparent workaround is to reposition the overlays with JS.
 */
LG.repositionColumnOverlays = function(difference){

	// Scroll the colum headers as the user scrolls
	// Note: Refine should be doing this, but fails

	var table = $("table.data-table");
	var tableContainerHeight = $("div.data-table-container").height();
	var colHeaderTDHeight = $("table.data-header-table tbody tr td.column-header").eq(0).height();
	var rightPanel = $("div#right-panel");

	$("div.column-overlay").each(function(){

		// Hide any column overlays that are scrolled out of view
		$(this).css("left",$(this).data("leftPosition")-difference+"px");

		var overlayEdge = $(this).width() + $(this).offset().left;
		var screenEdge = $(window).width();

		if(parseInt($(this).css("left")) < 300){
			$(this).css("visibility","hidden");
		} else if(overlayEdge > (screenEdge+10)){
			$(this).css("visibility","hidden");
		} else {
			if(overlayEdge > (screenEdge-10) && table[0].scrollWidth > rightPanel.width()
					&& table[0].scrollHeight > tableContainerHeight){
				$(this).css("visibility","hidden");
			} else if(table[0].scrollWidth > rightPanel.width()
					&& table[0].scrollHeight > tableContainerHeight){	
				// Both scroll bars present
				// Decrease the height of the overlays so they don't obstruct the bottom scroll bar
				$(this).height(tableContainerHeight+colHeaderTDHeight-5);
				$(this).css("visibility","visible");
			} else {
				$(this).height(table.height()+colHeaderTDHeight+10);
				$(this).css("visibility","visible");
			}	
		}
	});

};

/*
 * removeColumnOverlays
 * 
 * Removes any column overlays created
 */
LG.removeColumnOverlays = function(){
	$("div.column-overlay").remove();
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
 * injectWizardProgressOverlay
 * 
 * Appends the wizard to the project page body,
 */
LG.injectWizardProgressOverlay = function() {
	
	$("body").append(
			"<div class='wizardProgressMessage'>" +
			"<div class='overlay'><!-- --></div>" +
			"<p><span>Updating...</span><img src='images/large-spinner.gif' /></p>" +
	"</div>");
	
	$('div.wizardProgressMessage p').css("top",(($(window).height()-92)/2)-$("div.wizardProgressMessage p").height()+"px");
};

/*
 * showWizardProgress
 * 
 * Shows or hides the wizard progress message.
 * 
 * Commented out is a timeout that detects if 10 seconds has passed
 * in which case it displays a "Something might have gone wrong" message.
 * This incorrectly appears too often however, hence it being commented out.
 */
LG.showWizardProgress = function(show, message) {

	if (show) {

		if(message){
			$('div.wizardProgressMessage p span').html(message);
		} else {
			$('div.wizardProgressMessage p span').html("Updating...");			
		}
		
//		$('div.wizardProgressMessage p').find("span.cancel").remove();
		$('div.wizardProgressMessage p').css("top",(($(window).height()-92)/2)-$("div.wizardProgressMessage p").height()+"px");
		$('div.wizardProgressMessage').show();
		$("body").addClass("wizard-progress");
/*
		try{
			clearTimeout(LG.vars.progressTimeout);
		}catch(e){log(e)};

		LG.vars.progressTimeout = setTimeout(function(){
			$('div.wizardProgressMessage p')
			.append($("<span />").addClass("cancel").text("Something might be wrong...")
					.append($("<a />").text("Cancel").click(function(){
						LG.showWizardProgress(false);
						//window.location.href = window.location.href;
					})
					)
			);
		},10000);
*/
	} else {
//		$('div.wizardProgressMessage p').find("span.cancel").remove();
		$('div.wizardProgressMessage').hide();
		$("body").removeClass("wizard-progress");
//		clearTimeout(LG.vars.progressTimeout);
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
	// Call the old resizeAll function - found in the core project.js file.
	resizeAll();
	// Rebuild the column overlays
	LG.buildColumnOverlays();
};

/*
 * addReconciliationService
 * 
 * Adds a reconciliation service to Refine's ReconciliationManager or the RDF extension's 
 * RdfReconciliationManager (depending on whether it's a SPARQL endpoint or a standard endpoint).
 * 
 * Also makes sure we aren't adding the same service.
 */
LG.addReconciliationService = function(serviceCfg, serviceNameSuffix, callback){

	//log("addReconciliationService");

	var self = this;

	/*
	 * Loop through the services to find the matching service using the serviceCfg variable.
	 * 
	 * Check that the same service hasn't been added already.
	 * 
	 * Check it's type - standard or sparql.
	 * 
	 * Add it the correct way - to Refine's recon manager or the RDF extension's recon manager.
	 */
	var services = LG.vars.reconServices;
	var standardServices = ReconciliationManager.standardServices;
	var service = undefined;

	for(var i=0; i<standardServices.length; i++){
		if(standardServices[i].name.indexOf(serviceCfg.serviceName) >= 0){
			// The service has already been added
			// Find the service in our services list and add 
			// the ID and URL of the already-registered service
			for(var j=0; j<services.length; j++){
				if(serviceCfg === services[j]){
					service = services[j];
					try {
						// Mimic the returned data we get by actually registering a service
						// (id and URL).
						service.serviceURL = standardServices[i].url;
						service.id = standardServices[i].url.split("http://127.0.0.1:3333/extension/rdf-extension/services/")[1];
					}catch(e){
						log(e);
						service = undefined;
					}
					j = services.length-1;
					i = standardServices.length-1;
				}
			}
		}
	}

	if(typeof service == 'undefined'){

		for(var i=0; i<services.length; i++){

			if(serviceCfg === services[i]){

				var service = services[i];

				//log("services "+i);

				// Skip looking for any more matches
				i = services.length-1;

				//log("found service config for "+service.name);
				//log("service type = "+service.type);

				if(service.serviceType == "standard"){

					ReconciliationManager.registerStandardService(service.endpoint);
					log("Successfully added service - "+service.serviceName);

					callback(service);

				} else if(service.serviceType == "sparql"){

					ReconciliationManager.save(function(){

						$.post("/command/rdf-extension/addService",{
							"datasource":"sparql",
							"name":service.serviceName+(serviceNameSuffix == 1 ? "" : "-"+serviceNameSuffix),
							"url":service.endpoint,
							"type":"plain",
							"graph":"",
							"properties":service.labelURI
						},
						function(data){
							if(typeof data.code != 'undefined' && data.code != 'error'){
								log("Successfully added service");
								/*
								 * Store the ID & URL given to the service by the RDF extension 
								 * back into our service object
								 */
								service.id = data.service.id;
								service.serviceURL = "http://127.0.0.1:3333/extension/rdf-extension/services/"+service.id;
								RdfReconciliationManager.registerService(data);

								callback(service);

							} else {
								log("Error adding service");
								serviceNameSuffix = serviceNameSuffix+1;
								/*
								 * Add the same service again, but this time, adding an integer suffix to the end
								 * of it's name (to avoid a clash).
								 */
								LG.addReconciliationService(service, serviceNameSuffix, callback);
							}
						},"json");
					});
				}


			}
		}
	} else {
		// Service has already been added, call the callback with the service
		callback(service);
	}


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

	str = str.toLowerCase().trim();
	str = str.replace(/&/g,"And");

	return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
		if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
		return index == 0 ? match.toLowerCase() : match.toUpperCase();
	});
};

LG.urlifyColumnName = function(str){
	return escape(LG.camelize(str.replace(/\//g,"Or")));
}

/*
 * restoreHistory
 * 
 * Rolls back the undo history to the specified history ID.
 */
LG.restoreHistory = function(historyID){

	Refine.postCoreProcess(
			"undo-redo",
			{ lastDoneID: historyID },
			null,
			{ everythingChanged: true }
	);
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
				callback(DOM._loadedHTML[fullPath]);
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

function sortArrayOfObjectsByKey(object, key){
	return object.sort(function(a, b){
		var obj1key = a[key].toLowerCase();
		var obj2key = b[key].toLowerCase(); 
		return ((obj1key < obj2key) ? -1 : ((obj1key > obj2key) ? 1 : 0));
	});
}



/*
 * A degradable logging function - can be 
 * turned on and off using LG.vars.debug.
 */
function log(str) {
	window.console && console.log && LG.vars.debug && console.log(str);
}

/*
 * Center an element on the page
 */
jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + 
                                                $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + 
                                                $(window).scrollLeft() + "px");
    return this;
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function() {

	$("body").append("<div class='loading-message'><p>Loading...</p><p><img src='../images/small-spinner.gif' /></p></div>");
	$("body").find("div.loading-message").css("padding-top",($(window).height()/2)-100+"px");

	LG.initialise();

});