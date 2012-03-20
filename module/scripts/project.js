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
	this.setupModeButton();

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
					// Store the 
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
			 * Overwrite Refine's data-table "render" function, 
			 * so we can include our functions that 
			 * need to be called every time the table UI is updated.
			 */
			ui.dataTableView.render2 = ui.dataTableView.render;
			ui.dataTableView.render = function(){
				// Let Refine re-render the table
				ui.dataTableView.render2();
				// Whenever Refine updates the data table, it removes the classes from the table 
				// header - which destroys our RDF symbols
				LG.rdfOps.applyTypeIcons.apply();
				// as well as our hidden column classes.
				LG.ops.keepHiddenColumnsHidden();
				// Reinject column quick-tool
				LG.injectQuickTool();
				// Keep certain buttons and tabs hidden if we're in basic mode
				LG.applyMode();
				// Perform a window resize
				$(window).resize();
			}

			/*
			 * Save the base URI for the project
			 */
			LG.rdfOps.saveBaseUri(LG.vars.rdfSchema.baseUri);

			/*
			 * Perform a generic update once everything has loaded
			 */
			Refine.update({everythingChanged:true}, function(){
				/*
				 * Initialise misceallaneous functions
				 */
				LG.addUnhideColumnButton();
				LG.setupQuickTool();
			});

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
	
	if(LG.vars.mode == "basic"){
		display = "none";
		columnHeaderNameMarginLeft = "2px";
	}
	
	// Show/hide the column menu buttons
	$("a.column-header-menu").css("display", display);
	$("span.column-header-name").css("margin-left", columnHeaderNameMarginLeft);
	
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
	
	if(mode == "basic"){
		// Basic mode settings
		h2Top = "60px";
		typingPanelBodyTop = "37px";
		columnHeaderNameMarginLeft = "2px";
		display = "none";
		buttonText = "Expert mode";
		buttonTitle = "Switch to expert mode";
	}
	
	// Make sure the Typing panel is showing before we switch
	$("a[href='#refine-tabs-typing']").click();

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
	// Show extension buttons
	$("div#extension-bar").css("display", display);
	// Show edit link in cells	
	$("a.data-table-cell-edit").css("display", display);
	// Change button text
	$("a#expert-mode").text(buttonText).attr("title", buttonTitle);
	
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
 * createDialog
 * 
 * Takes an object containing:
 * o.header = the header text for the dialog
 * o.body = the body text for the dialog
 * o.footer = the footer text 
 * o.buttons = a list names and callbacks to create buttons
 * o.ok = callback for the ok button
 * o.cancel = callback for the cancel button
 * o.className = the className for custom styling
 */
LG.createDialog = function(o){

	var dialog = DialogSystem.createDialog();
	var header = $('<div></div>').addClass("dialog-header").append(o.header).appendTo(dialog);
	var body = $('<div></div>').addClass("dialog-body "+o.className).append(o.body).appendTo(dialog);
	var footer = $('<div></div>').addClass("dialog-footer").append(o.footer).appendTo(dialog);


	if(o.ok){
		if(typeof o.ok == "object"){
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(o.ok).appendTo(footer);
		} else {
			$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function(){
				DialogSystem.dismissAll();
			}).appendTo(footer);
		}
	}	
	if(o.cancel){
		if(typeof o.cancel == "object"){
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
		} else if(overlayEdge > (screenEdge+15)){
			$(this).css("visibility","hidden");
		} else {
			$(this).css("visibility","visible");
			if(table[0].scrollWidth > rightPanel.width()
					&& table[0].scrollHeight > tableContainerHeight){	
				// Both scroll bars present
				// Decrease the height of the overlays so they don't obstruct the bottom scroll bar
				$(this).height(tableContainerHeight+colHeaderTDHeight-5);
			} else {
				$(this).height(table.height()+colHeaderTDHeight+10);
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
 * injectWizardProgressOverlay
 * 
 * Appends the wizard to the project page body,
 */
LG.injectWizardProgressOverlay = function() {
	$("body").append(
			"<div class='wizardProgressMessage'>" +
			"<div class='overlay'><!-- --></div>" +
			"<p>Updating...<img src='images/large-spinner.gif' /></p>" +
	"</div>");
};

/*
 * showWizardProgress
 * 
 * Shows or hides the wizard progress message.
 */
LG.showWizardProgress = function(show) {
	// Create a timeout incase a 
	var timeout = undefined;
	
	$('div.wizardProgressMessage p').find("span.cancel").remove();

	if (show) {

		$('div.wizardProgressMessage').show();
		$("body").addClass("wizard-progress");

		clearTimeout(timeout);

		timeout = setTimeout(function(){
			$('div.wizardProgressMessage p')
			.append($("<span />").addClass("cancel").text("Hmmm...something might be wrong!")
					.append($("<a />").text("Cancel").click(function(){
						LG.showWizardProgress(false);
						//window.location.href = window.location.href;
					})
					)
			);

		},10000);

	} else {
		$('div.wizardProgressMessage').hide();
		$("body").removeClass("wizard-progress");
		clearTimeout(timeout);
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
	// Rebuild the column overlays
	LG.buildColumnOverlays();
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
			"Refresh page": function(){
				window.location = window.location;
			}
		},
		className:"jsError"
	});

	DialogSystem.showDialog(dialog);

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
 * addReconciliationServices
 * 
 * Recursive function that iterates through the LG.vars.reconServices list 
 * and makes sure they are added into Refine's list of reconciliation services.
 */
LG.DEAD_addReconciliationServices = function(index, serviceNameSuffix, callback){

	/*
		datasource	sparql
		graph	
		name	UK Government Departments
		properties	
		type	plain
		url	http://services.data.gov.uk/reference/sparql
	 */

	ReconciliationManager.standardServices.length = 0;

	if(LG.vars.reconServices[index].type == "standard"){

		ReconciliationManager.registerStandardService(LG.vars.reconServices[index].endpoint);
		log("Successfully added service - "+LG.vars.reconServices[index].name);

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
			index++;
			LG.addReconciliationServices(index, serviceNameSuffix, callback);
		}

	} else if(LG.vars.reconServices[index].type == "sparql"){

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
						index++;
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

	str = str.trim();
	str = str.replace(/&/g,"And");

	return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
		if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
		return index == 0 ? match.toLowerCase() : match.toUpperCase();
	});
};


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
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function() {

	LG.initialise();

	window.onerror = function(o) {
		LG.handleJSError(o);
	};

	window.alert = function(s) {
		var dialog = LG.createDialog({
			header:"Oops!",
			body:$("<p />").text(s),
			ok:true,
			className:"alert"
		});
		DialogSystem.showDialog(dialog);
	};


});