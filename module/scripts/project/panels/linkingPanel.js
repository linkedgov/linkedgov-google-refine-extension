/*
 * LinkingPanel
 * 
 * Aka the "reconciliation" panel - suggests and allows the user to select columns
 * to reconcile against provided services. Multiple columns can be reconciled at once, 
 * and the user can pick up from where they left as existing reconciliation data can be 
 * detected.
 */
var LinkedGov_LinkingPanel = {

		/*
		 * initialise
		 * 
		 * Sets up variables and adds listeners to buttons for the panel
		 */
		initialise : function() {

			var self = this;

			// A shortcut to the bound elements in the panel
			// We rebind the elements because we've dynamically loaded 
			// the linking panel HTML which includes bound elements (the panels).
			self.els = DOM.bind(ui.typingPanel._div);

			// A shortcut to the panel's body
			self.body = self.els.linkingPanel;

			// Declare the suggested links, confirmed links and result arrays
			self.suggestedLinks = [];
			self.confirmedLinks = [];
			self.existingLinks = [];
			self.results = [];

			// Initialise the suggest and preview pane
			self.suggestPane = "";
			self.previewPane = "";

			// Initialise the cache variables to avoid 
			// cross-browser index-out-of-range errors.
			// TODO: Doesn't seem to have an effect (Safari).
			self.suggestCache = {
					"a":"b"
			};
			self.previewCache = {
					"a":"b"					
			};

			// Set up the vocabularies we use to store the RDF
			self.vocabs = {
					lg:{
						uri:LG.vars.projectURI,
						curie:"lg"
					},
					rdfs:{
						uri : "http://www.w3.org/2000/01/rdf-schema#",
						curie : "rdfs"
					}
			};

			/*
			 * Unregister reconciliation services, then load the ones we want.
			 * 
			 * This is to avoid a build-up of duplicate services as they get stored 
			 * in the project's metadata store somewhere.
			 * 
			 * TODO: Only for localhost. Once running on a server - the services will 
			 * only need to be added as a one off (optimisation).
			 * 
			 * Have commented out the resetting of recon services as we can now
			 * make use of the services if they are already added in Refine.
			 */
			// After removing and saving 0 services, we load our 
			// array of our own services and store them in an object.
			$.getScript("extension/linkedgov/scripts/project/reconciliationServices.js", function(data){
				// After loading the reconciliation service configs, 
				// we store them in the global LG.vars object.
				LG.vars.reconServices = eval('(' + data + ')');
				// As part of the callback, we then set up the 
				// different panes of the linking panel
				self.setupListOfServices();
				self.setupSuggestLinks();
				self.setupManualLinks();
				self.setupConfirmedLinks();
				self.setupExistingLinks();
				self.setupResultPanel();

			});	
			//});

			// Interaction for the "Link" button
			self.els.linkButton.unbind("click").bind("click", function(){
				// If the user has selected at least one column and a service (as a confirmed link)
				// and begin to reconcile
				if(typeof self.confirmedLinks != 'undefined' && self.confirmedLinks.length > 0){

					// Show the result panel		
					self.buildProgressBars(function(){
						$("p.loader").hide();
						self.showResultPanel();
					});

					// LG.showWizardProgress(true);

				} else {
					LG.alert("You need to confirm which columns you want to link. Click the " +
					"'Suggest links' button to see which columns might be linkable.");
				}

			});

			// Interaction for the "Save" button
			self.els.saveButton.click(function(){
				// Save our RDF into the existing - or new - root node
				LG.rdfOps.checkSchema(self.vocabs, function(rootNode, foundRootNode) {
					self.saveRDF(rootNode, foundRootNode);
				});
			});

		},


		/*
		 * displayPanel
		 * 
		 * Hides the other Typing-panels and shows the appropriate 
		 * elements when the linking panel tab is clicked on.
		 */
		displayPanel: function(){

			var self = this;
			// Hide the other panels
			LG.panels.typingPanel.hidePanels();
			// Hide the action buttons
			this.els.actionButtons.hide();
			// Show the collapse-expand button
			this.els.collapseExpandButton.hide();
			// Hide the "return to wizards" button
			this.els.returnButton.hide();
			// Show the action bar
			this.els.actionBar.show();
			// Show the finish button
			this.els.finishButton.hide();
			// Show this panel
			this.body.show();
			// Hide the back button
			this.els.returnButton.hide();
			/*
			 * Show buttons depending on what panel is 
			 * being shown
			 */
			if($("div.reconcile-panel").css("display") != "none"){
				// Show the results panel
				this.showResultPanel();
			} else {
				// Show the suggest panel
				this.showSuggestPanel();
			}
		},

		/*
		 * showSuggestPanel
		 * 
		 * Shows the panel that suggests & asks the user to confirm 
		 * links
		 */
		showSuggestPanel:function(){
			var self = this;
			// Hide the save button
			this.els.saveButton.hide();
			// Hide the cancel button
			this.els.cancelButton.hide();			
			// Show the suggest panel
			this.els.suggestPanel.show();
			// Hide the reconcile panel
			this.els.reconcilePanel.hide();
			// Hide the back button
			this.els.returnButton.show();
			// Setup and show the "back" button
			this.els.returnButton.unbind("click").bind("click", function(){
				$("ul.lg-tabs li a[rel='wizards-panel']").click();
				LG.panels.wizardsPanel.displayPanel();
			}).show();
			
			// Check to see if there are any confirmed columns already on the panel
			if($("div.confirmed-links ul.confirmed-columns li").length > 0){
				// Show the link button
				this.els.linkButton.show();
			} else {
				
				// Show the "next" button
				this.els.nextButton.unbind("click").bind("click", function(){
					if($("div.suggest-panel ul.selected-columns li[class!='none']").length > 0){
						DialogSystem.showDialog(
								LG.createDialog({
									header:"Hang on!",
									body:"<p>There appear to be columns that have been suggested or picked by you that haven't been confirmed yet!</p><p>If you want to reconcile these columns, you must click on the green tick icon to confirm them.</p>",
									ok:true
								})
						);
					} else {
						//LG.panels.labellingPanel.displayPanel();
						$("ul.lg-tabs li a[rel='labelling-panel']").click();
						LG.panels.labellingPanel.displayPanel();
					}
				}).show();				
			}

		},

		/*
		 * showResultPanel
		 * 
		 * Shows the panel that displays the reconcilation results
		 */
		showResultPanel:function(){

			var self = this;

			// Hide the link button
			self.els.linkButton.hide();

			// Hide the suggest panel
			self.els.suggestPanel.hide();

			// Remove any existing results
			$("div.linking-results div.result").remove();
			$("div.linking-results p.loader").remove();
			$("<p />").addClass("loader").append($("<img />").attr("src","images/small-spinner.gif")).appendTo($("div.linking-results"));

			// Show & set up the cancel button if the
			// user has began reconciling a column
			if(self.confirmedLinks.length > 0){
					
				self.els.cancelButton
				.css("display","inline-block")
				.unbind("click").bind("click",function(){

					// Create the dialog itself
					var dialog = LG.createDialog({
						header: "Are you sure?",
						body: "Any values that have been reconciled will be lost.",
						ok:function(){
							DialogSystem.dismissAll();	
							self.cancelAndReset();
						},
						cancel:function(){
							DialogSystem.dismissAll();
							
						},
						className:"confirm"
					});

					// Display the dialog
					DialogSystem.showDialog(dialog);
				});				
			} else {
				// Show result panel without any confirmed links?
			}

			// Show the reconcile panel
			this.els.reconcilePanel.show(0, function(){
				// Begin reconciliation on the confirmed columns
				self.buildResultObjects();					
			});

			// Show the back button
			this.els.returnButton.unbind("click").bind("click", function(){
				// Reset the confirmed links
				self.confirmedLinks = [];
				$("div.confirmed-links ul.confirmed-columns").html("").hide();
				// Hide the confirmed links <div>
				$("div.confirmed-links").hide();
				// Hide the confirmed links header
				$("div.suggest-panel h3.confirmed").hide();
				self.showSuggestPanel();
				// Repopulate the existing links list
				self.setupExistingLinks();
			}).show();
		},

		/*
		 * setupListOfServices
		 * 
		 * Creates and loads a list of the reconciliation services 
		 * available to the user to link to their data and displays 
		 * them in a list at the top of the panel.
		 */
		setupListOfServices:function(){

			var self = this;

			var ul = $("div.list-of-services ul");

			for(var i=0; i<LG.vars.reconServices.length; i++){
				ul.append($("<li />").text(LG.vars.reconServices[i].serviceName));
			}

			// When the user clicks the "Show available services" link,
			// the list slides down
			$("div.list-of-services a").toggle(function(){
				$(this).parent().find("ul").slideDown();
				$(this).html("Hide list of services");
			}, function(){
				$(this).parent().find("ul").slideUp();
				$(this).html("Show list of available services");
			});

		},

		/*
		 * setupSuggestLinks
		 * 
		 * Sets up interaction for the suggest-links feature.
		 * 
		 * 1. User clicks "Suggest links" button.
		 * 2. Scan column headers for hint words
		 * 3. Create, inject and display a list of links
		 * 4. User confirms or removes links.
		 * 5. User presses "Link".
		 * 6. Columns begin to reconcile.
		 */
		setupSuggestLinks:function(){

			//log("setupSuggestLinks");

			var self = this;

			// Interaction for the "Suggest links" button
			$("div.suggest-links a.suggestButton").live("click",function(){
				// Change the button's text to an "in-progress" message
				$(this).html("Suggesting...").addClass("selecting");
				// Add a loading icon
				$(this).after('<span class="column-selecting-icon"><img src="extension/linkedgov/images/column_selecting.gif" /></span>');
				// Begin to suggest links
				self.suggestLinks();
				// Display the "Clear all" button that will allow the user
				// to clear the suggested links
				$("div.suggest-links a.clearButton").css("display","inline-block");
				// Hide the "Suggest links" button
				$("div.suggest-links a.suggestButton").hide();
			});

			// Interaction for the "Clear" button
			$("div.suggest-links a.clearButton").live("click",function(){
				// Hide the "Clear all" button
				$("div.suggest-links a.clearButton").hide();
				// Show the "Suggest links" button
				$("div.suggest-links a.suggestButton").css("display","inline-block");
				// Remove the suggested links and hide the list
				$("div.suggest-links ul.selected-columns").html("").hide();
				// Reset the suggested-links, confirmed-links and result arrays
				self.suggestedLinks = [];
			});

			// Interaction for the confirm icon for each suggested link
			$("div.suggest-links span.confirm").live("click",function(){

				// Add the confirmed suggestion to a new object containing only confirmations
				self.confirmedLinks.push(self.suggestedLinks[parseInt($(this).parent().data("index"))]);

				// Add column to confirmed list
				$("div.confirmed-links ul.confirmed-columns").append('<li><span class="col">'+$(this).parent().find("span.col").html()+'</span><span class="link">'+$(this).parent().find("span.link").html()+'</span></li>').show();
				// Show confirmed list
				$("div.confirmed-links").show();
				// Show "Clear" button for confirmed links
				$("div.confirmed-links a.clearButton").css("display","inline-block");
				// Show confirmed header
				$("div.suggest-panel h3.confirmed").show();
				// Remove column from suggested list
				$(this).parent("li").slideUp(500,function(){
					var ul = $(this).parent();
					$("div.confirmed-links ul.confirmed-columns li:last").slideDown(500);
					$(this).remove();
					// Hide the selected-columns list if there are none left (removes their 
					// margin-gap and hide the "Clear" button
					if(ul.children("li").length < 1){
						ul.hide();
						ul.parent("div").find("a.clearButton").hide();
						ul.parent("div").find("a.suggestButton").show();
					}
				});

				self.showLinkButton();

			});

			// Interaction for the remove icon for each suggested link
			$("div.suggested-links ul.selected-columns li span.remove").live("click",function(){
				$(this).parent("li").slideUp(500,function(){
					var ul = $(this).parent("ul");
					$(this).remove();
					if(ul.children("li").length < 1){
						ul.parent("div").find("a.clearButton").hide();
						ul.parent("div").find("a.suggestButton").show();
						ul.hide();
					}
				});

				self.showLinkButton();
			});

		},

		/*
		 * setupManualLinks
		 * 
		 * Sets up interaction for the manual links feature
		 * 
		 * 1. User selects a column
		 * 2. Select-list of service names available to choose from
		 * 3. User selects a service.
		 * 4. User presses "Link".
		 * 5. Columns begin to reconcile.
		 * 
		 * TODO: the LG.panels.wizardsPanel.getFragmentData is being used here, 
		 * which isn't great. The function should be moved into the generic operations file.
		 */
		setupManualLinks:function(){

			//log("setupManualLinks");

			var self = this;

			$("div.manual-links ul.selected-columns li span.confirm").live("click",function(){

				var addLink = true;
				var columnName = $(this).parent("li").find("span.col").html();
				var service = LG.vars.reconServices[parseInt($(this).parent("li").find("select").val())];

				// Check that the column hasn't already been confirmed - or that it exists as an 
				// existing link
				for(var i=0; i<self.confirmedLinks.length; i++){
					if(columnName == self.confirmedLinks[i].columnName){
						addLink = false;
					}
				}
				for(var i=0; i<self.existingLinks.length; i++){
					if(columnName == self.existingLinks[i].columnName){
						addLink = false;
					}
				}

				if(addLink){

					// Add the confirmed suggestion to a new object containing only confirmations
					self.confirmedLinks.push({
						columnName:columnName,
						service:service
					});

					// Add column to confirmed list
					$("ul.confirmed-columns").append('<li><span class="col">'+columnName+'</span><span class="link">'+service.serviceName+'</span></li>').show();			
					// Show list
					$("div.confirmed-links").show();
					// Show "Clear" button for confirmed links
					$("div.confirmed-links a.clearButton").css("display","inline-block");
					// Show confirmed header
					$("div.suggest-panel h3.confirmed").show();
					// Remove column from manual links list
					$(this).parent("li").slideUp(500,function(){
						var ul = $(this).parent();
						$(this).remove();
						// Hide the selected-columns list if there are none left (removes their 
						// margin-gap
						if(ul.children("li").length < 1){
							ul.hide();
						}
						$("div.confirmed-links ul.confirmed-columns li:last").slideDown(500);
					});

					self.showLinkButton();

				} else {
					LG.alert("This column has already been confirmed or there is reconciliation data that exists for this column already");
				}

			});

			// Interaction for the remove button in the column list.
			// When a user clicks the remove button for a column in the manual links list,
			// we remove the entry from the list
			$("div.manual-links ul.selected-columns li span.remove").live("click",function(){
				$(this).parent("li").slideUp(500,function(){
					var ul = $(this).parent("ul");
					$(this).remove();
					if(ul.children("li").length < 1){
						ul.hide();
					}
				});

				self.showLinkButton();
			});

		},

		/*
		 * setupConfirmedLinks
		 * 
		 * Sets up interaction for the confirmed columns list
		 */
		setupConfirmedLinks:function(){

			var self = this;

			// Interaction for the "Clear all" button
			$("div.confirmed-links a.clearButton").live("click",function(){
				// Remove the confirmed links and hide the list
				$("div.confirmed-links ul.confirmed-columns").html("").hide();
				// Hide the confirmed links <div>
				$("div.confirmed-links").hide();
				// Hide the confirmed links header
				$("div.suggest-panel h3.confirmed").hide();
				// Reset the confirmed-links array
				self.confirmedLinks = [];
				// Hide the "Save" button
				self.els.linkButton.hide();
				// Show the "Next" button
				self.els.nextButton.show();
			});

		},

		/*
		 * setupExistingLinks
		 * 
		 * Displays the columns and links for existing reconciliation.
		 * 
		 * 1. Check all columns for existing reconciliation data
		 * 2. Grab the column name and the service name
		 * 3. Create, inject and show a list in the existing links pane
		 * 4. User presses "Link"
		 * 5. Existing reconciliation data appears in the results panel
		 * alongside newly reconciled data.
		 */
		setupExistingLinks:function(){

			//log("setupExistingLinks");

			var self = this;

			var columns = theProject.columnModel.columns;
			var ul = $("div.existing-links").find("ul").html("");
			var showList = false;
			// If we don't have the service config for the existing reconciliation 
			// data, then we list the existing linked service as missing.
			var serviceName = "Missing service";
			var service = {};
			self.existingLinks = [];

			// Loop through the column model to find columns with reconciliation objects
			for(var i=0; i<columns.length; i++){

				// Check that the column also has at least one matched topic
				if(typeof columns[i].reconConfig != 'undefined' 
					&& typeof columns[i].reconStats != 'undefined'){
					// (This line has been taken out as it's possible to reconcile 
					// a column with no matches
					//	&& columns[i].reconStats.matchedTopics > 0){

					// This column has reconciliation data

					// Find the service name by looping through the 
					// service configs and matching the type URI					
					for(var j=0; j<LG.vars.reconServices.length; j++){
						if(LG.vars.reconServices[j].resourceInfo.resourceURI == columns[i].reconConfig.type.id){
							// We have found the matching reconciliation service
							serviceName = LG.vars.reconServices[j].serviceName;
							service = LG.vars.reconServices[j];
						}
					}

					// Add the existing link as an entry to the HTML list
					var li = $("<li />")
					.data("colName",columns[i].name)
					.append($("<span class='col' />").text(columns[i].name))
					.append($("<span class='remove' />").text("X"))
					.append($("<span class='link' />").text(serviceName));

					ul.append(li);

					// Store the existing column-service link in an array.
					// This is used to check against when suggesting links to the user,
					// so we don't suggest to reconcile a column with existing reconciliation 
					// data
					self.existingLinks.push({
						columnName:columns[i].name,
						serviceName:serviceName,
						service:service,
						_li:li
					});

					showList = true;
				}
			}

			// Inject the HTML and make sure the containing elements are 
			// visible if there actually are existing links
			if(showList){
				ul.show();
				$("div.existing-links").find("div.existing").show();
				$("div.existing-links").show();
				$("h3.existing-links").show();
			} else {
				ul.hide();
				$("div.existing-links").find("div.existing").hide();
				$("div.existing-links").hide();
				$("h3.existing-links").hide();				
			}

			// Set up interaction for the remove button for each link in the list.
			// When the user clicks the remove icon on a column/service item in the existing links 
			// panel - it asks them to confirm if they want to erase the reconciliation data before
			// erasing it.
			$("div.existing-links ul.existing-columns li span.remove").unbind("click").bind("click",function(){		

				var el = $(this);
				// Store the column name relating to the clicked remove sign
				var columnName = $(this).parent("li").data("colName");
				// Make the user confirm that they want to delete all reconciliation data for the selected
				// column				

				// Create the dialog itself
				var dialog = LG.createDialog({
					header: "Are you sure?",
					body:"This will delete the reconciliation data for the column \""+columnName+"\".",
					ok:function(){
						DialogSystem.dismissAll();	
						self.removeExistingLink(el, columnName);
					},
					cancel:function(){
						DialogSystem.dismissAll();
					},
					className:"confirm"
				});

				// Display the dialog
				DialogSystem.showDialog(dialog);
			});

			// Set up interaction for the "View results" button
			$("div.existing-links a.viewResults").unbind("click").bind("click",function(){
				self.showResultPanel();
				self.els.saveButton.show();
				self.els.nextButton.hide();
			});

		},

		/*
		 * removeExistingLink
		 * 
		 * Removes an entry in the existing links list when the user
		 * clicks the red cross.
		 */
		removeExistingLink:function(el, columnName){
			
			var self = this;
			
			// 1. Slide and hide the entry from the list
			el.parent().slideUp(function(){

				el.parent().remove();

				if($("ul.existing-columns li").length < 1){
					$("div.existing").hide();
					$("h3.existing-links").hide();
					$("div.existing-links").hide();
				}

				self.removeColumnReconciliation(columnName, function(colName){
					// 3. Remove the link from the existingLinks array
					for(var i=0; i<self.existingLinks.length; i++){
						if(self.existingLinks[i].columnName == colName){
							self.existingLinks.splice(i,1);
						}
					}
					self.showLinkButton();
				});
			});
			
		},

		/*
		 * Checks to see if the user has confirmed any links in which 
		 * case we display the "Link" button.
		 */
		showLinkButton:function(){

			var self = this;

			if(self.confirmedLinks.length > 0){
				// show the link button
				self.els.linkButton.show();
				self.els.nextButton.hide();
			} else {
				// hide the link button
				self.els.linkButton.hide();
				self.els.nextButton.show();
			}
		},

		/*
		 * setupResultPanel
		 * 
		 * Sets up interaction for the result panel
		 */
		setupResultPanel:function(){

			//log("setupResultPanel");

			var self = this;

			// Interaction for result headers
			$("div.result a.colName").live("click",function(){

				$("div.result div.result-body").slideUp()
				$("div.result a.colName").removeClass("expanded");

				if($(this).parent("div").find("div.result-body").css("display") == "none"){
					$(this).parent("div").find("div.result-body").slideDown();
					$(this).addClass("expanded");
				}

				// Update the matches-bar
				self.updateMatches($(this).parent());
			});
		},

		/*
		 * loadHTML
		 * 
		 * Inject the labellingPanel HTML
		 */
		loadHTML: function(){
			// Loads the linkingPanel HTML into it's body - which can be accessed through the 
			// typingPanel object.
			ui.typingPanel._el.linkingPanel.html(DOM.loadHTML("linkedgov", "html/project/panels/linkingPanel.html"));
		},

		/*
		 * buildProgressBars
		 * 
		 * Creates and injects progress-bars in HTML for columns that have 
		 * been chosen to be reconciled.
		 * 
		 * Once these progress bars have bene created, offer a callback.
		 * 
		 * TODO: If one column has finished reconciling, it does not reflect that.
		 * 
		 */
		buildProgressBars:function(callback){

			//log("buildProgressBars");

			var self = this;

			// Wipe any existing progress bars from the panel
			$("div.linking-loading div.progressDiv").remove();

			// Loop through the confirmed columns and create their own progress bar HTML
			for(var i=0;i<self.confirmedLinks.length;i++){

				var div = $("<div class='progressDiv' />")
				.append($("<p class='columnName' />")
						.append($("<span class='name' />").text(self.confirmedLinks[i].columnName))
						.append($("<span class='percentage' />").text("(0%)"))
				)
				.append($("<p class='service' />").text(self.confirmedLinks[i].service.serviceName))
				.append($("<div class='recon-bar ui-progressbar' />")
						.append($("<div class='ui-progressbar-value' />"))
				);

				// Inject the HTML into the loading panel
				$("div.linking-loading").append(div);
			}

			// If we're building progress bars then we can reset the results panel
			$("div.linking-results div.result").remove();
			$("div.linking-results").hide();
			$("div.linking-loading").show();

			if(callback){
				callback();
			}
		},


		/*
		 * pollReconciliationJobs
		 * 
		 * Hooks onto Refine's default "get-processes" command (which returns information 
		 * about any running command be it reconciliation or not).
		 * 
		 * The call returns an array of process objects which contain a progress percentage 
		 * we used to update the progress bars with.
		 * 
		 * Build
		 */
		pollReconciliationJobs:function(){

			//log("pollReconciliationJobs");

			var self = this;

			$.get("/command/core/get-processes?" + $.param({ project: theProject.id }), null, function(data) {


				self.numberOfRunningProcesses = data.processes.length;

				// Check to see if any processes have completed by testing the length of 
				// our processesArray against the returned processes object
				if(self.processesArray.length == 0){

					for(var i=0; i<data.processes.length; i++){
						self.processesArray.push({
							columnName : data.processes[i].description.split("Reconcile cells in column ")[1].split(" to type")[0],
							progress : data.processes[i].progress,
							complete: false
						});
					}
				}

				// If our process list has more processes than Refine's process list
				if(self.processesArray.length > data.processes.length){
					// A process has completed
					// Boolean to signal we've found our process
					var found = false;

					// Loop through our process list
					for(var i=0; i<self.processesArray.length; i++){

						// Loop through Refine's process list
						for(var j=0; j<data.processes.length; j++){

							// Make sure this is a reconciliation process
							if(data.processes[j].description.indexOf("Reconcile") >= 0){

								// Store Refine's process name
								var columnName = data.processes[j].description.split("Reconcile cells in column ")[1].split(" to type")[0];

								// Check to see if this process exists in our list already
								if(self.processesArray[i].columnName == columnName){
									// Yes it does - so this one hasn't completed yet
									self.processesArray[i].complete = false;
									// Skip the rest
								} else {
									self.processesArray[i].complete = true;
								}

								if(i == self.processesArray.length-1){

									for(var k=0; k<self.processesArray.length; k++){
										if(self.processesArray[k].complete){
											self.updateProgressBar(self.processesArray[k].columnName, 100);
											self.processesArray.splice(k,1);
											j=data.processes.length-1;
											k=self.processesArray.length-1;
											i--;
										}
									}
								}
							}
						}
					}
				} else {
					// Loop through our process list
					for(var i=0; i<self.processesArray.length; i++){
						// Loop through Refine's process list
						for(var j=0; j<data.processes.length; j++){
							// Make sure this is a reconciliation process
							if(data.processes[j].description.indexOf("Reconcile") >= 0){
								// Store Refine's process name
								var columnName = data.processes[j].description.split("Reconcile cells in column ")[1].split(" to type")[0];
								if(self.processesArray[i].columnName == columnName){
									// Update our processes progress
									self.processesArray[i].progress = data.processes[j].progress;
									self.updateProgressBar(self.processesArray[i].columnName, self.processesArray[i].progress);
								}
							}
						}
					}
				}
			});
		},

		/*
		 * updateProgressBar
		 * 
		 * Takes the column name and the progress percentage and updates the 
		 * CSS for the progress bar as the columns reconcile.
		 */
		updateProgressBar:function(columnName, percentage){

			//log("updateProgressBar - for "+columnName);

			$("div.linking-loading").find("div.progressDiv").each(function(){

				//log("if "+$(this).find("p.columnName").find("span.name").html()+" == "+columnName);

				if($(this).find("p.columnName").find("span.name").html() == columnName){

					$(this).find("p.columnName").find("span.percentage").html("("+percentage+"%)");

					$(this).find("div.ui-progressbar-value").css("width",percentage+"%");
					if(percentage == 100){
						$(this).find("p.columnName").find("span.percentage").css("margin-right","0");
						$(this).find("div.ui-progressbar-value").addClass("complete");
						$(this).find("p.columnName").css("background-image","none");
					}
				}
			});

		},
		
		
		/*
		 * Cancels reconciliation and resets the linking panel
		 */
		cancelAndReset: function(){
			
			//log("cancelAndReset");
			
			var self = this;
			
			self.cancelReconciliation(function(){
				
				//log("Callback for cancelReconciliation");
				
				// Use an interval to test whether the expected facets have been created from 
				// cancelling the reconciliation (2 per column)
				var interval2 = setInterval(function(){
					
					if(ui.browsingEngine._facets.length < (self.results.length*2)){
						// Facets haven't been created yet
						log("Waiting for reconciliation facets to be created...")
					} else {
						
						clearInterval(interval2);

						// After cancelling the processes, reset the arrays that were populated 
						// for the last reconciliation job.
						self.results = [];
						self.confirmedLinks = [];
						self.suggestedLinks = [];
						
						// Blank out & hide the result panel
						$("div.linking-results").hide();
						$("div.linking-results").html('<h3>Results</h3>');
						// Show the loading panel
						//$("div.linking-loading").show();

						// Make sure the suggested columns are cleared
						$("div.suggest-links a.clearButton").click();

						// Make sure the empty list is hidden
						$("div.suggest-links ul.selected-columns").hide();

						// Make sure the confirmed columns are cleared
						$("div.confirmed-links a.clearButton").click();

						// Hide the confirmed links div
						$("div.confirmed-links").hide();
						
						// Hide the "save" button
						self.els.linkButton.hide();
						// Hide the "save" button
						self.els.saveButton.hide();
						// Show the "next" button
						self.els.nextButton.show();
						
						// Facets have been created which means reconciliation has been 
						// finished cancelling.
						//
						// Remove each of the progress-bars for the columns
						$("div.linking-loading div.progressDiv").each(function(){
							$(this).remove();
						});

						// Hide the "wizard in progress" message
						// LG.showWizardProgress(false);
						
						try{
						//	ui.browsingEngine.remove();							
						}catch(e){
							log(e);
						}
						
						// Reshow the facet panel children which were hidden at the start of 
						// reconciliation
						//$("div#refine-tabs-facets").children().show();

						// Show the initial "suggest panel"
						self.showSuggestPanel();
						
						// Make sure the Typing panel is still showing as Refine attempts 
						// to switch to the facet panel when one is created
						$("div#left-panel div.refine-tabs").tabs('select', 1);
						
						// After cancelling reconciliation, rollback the history to the saved 
						// restore point.
						//LG.restoreHistory(self.historyRestoreID);
						
					}
				}, 500);

			});
			
		},


		/*
		 * cancelReconciliation
		 * 
		 * Cancels the reconciliation processes by calling Refine's "cancel-processes"
		 * in the same way the "Cancel" link does in Refine's notification.
		 */
		cancelReconciliation:function(callback){

			//log("cancelReconciliation");

			var self = this;
			self.hasBeenCancelled = true;

			$.post(
					"/command/core/cancel-processes?" + $.param({ project: theProject.id }), 
					null,
					function(o) {
						callback();
					},
					"json"
			);
		},

		/*
		 * suggestLinks
		 * 
		 * Suggests columns to reconcile (or "link") to the user. 
		 * 
		 * We use the list of "hints" provided with each reconciliation service config 
		 * to check whether a column name contains one of the hint words.
		 * 
		 * For each possible column-service link, an object's built that contains the
		 * column name and service.
		 */
		suggestLinks: function(){

			var self = this;

			// Reset the suggestedLinks array
			self.suggestedLinks = [];

			// Shortcut to our reconciliation services
			var services = LG.vars.reconServices;

			// Loop through each column name and check for any matches of hint words 
			// against any of the reconciliation services
			var cols = theProject.columnModel.columns;

			// Loop through cols
			for(var i=0; i<cols.length; i++){

				// Loop through services
				for(var j=0; j<services.length; j++){

					// Loop through the hint words of the service
					for(var k=0; k<services[j].hints.length; k++){

						// Create a suggested link if the column name contains one of the service's
						// hint words
						if(self.checkColumnNameForHint(cols[i].name, services[j], services[j].hints[k])){
							// Break out of the hints loop
							k=services[j].hints.length-1;
							// Break out of the services loop
							j=services.length-1;
						}
					}
				}
			}

			// Build and display a list of the suggested links
			if(self.suggestedLinks.length > 0){
				for(var i=0;i<self.suggestedLinks.length;i++){
					// The data-index property is used to record the index of the suggested link in the suggestedLinks array.
					// When a user confirms the link, we copy the link at that index from the suggestedLinks array into the confirmedLinks array.
					var li = $("<li />")
					.data("index", i)
					.append($("<span class='col' />").text(self.suggestedLinks[i].columnName))
					.append($("<span class='remove' />").text("X"))
					.append($("<span class='confirm' />").text("C"))
					.append($("<span class='link' />").text(self.suggestedLinks[i].service.serviceName));

					$("div.suggest-links ul.selected-columns").append(li);
				}
				$("div.suggest-links ul.selected-columns").css("display","block");
			} else {
				$("div.suggest-links ul.selected-columns").append($("<li class='none' />").text("None...")).css("display","block");
			}

			// Return the "Suggest links" button back to normal / remove it
			// TODO: This happens so fast, the user cannot see it, but when 
			// we use faceting to assess what values are in each column to provide us with a better , the need for a 
			// busy indicator will be needed. So leaving this code here for now.
			$("div.suggest-links a.suggestButton").html("Suggest links").removeClass("selecting");
			$("div.suggest-links span.column-selecting-icon").remove();

		},

		/*
		 * checkColumnNameForHint
		 */
		checkColumnNameForHint:function(colName, service, hint){

			//log("checkColumnNameForHint");

			var self = this;

			// Once we've looped through all of the existing links, 
			// check the suggestLink boolean,
			// lowercase the column header and check for an instance of each hint
			// before suggesting the link
			if(colName.toLowerCase().indexOf(hint) >= 0){

				// Boolean that lets us suggest a link
				var suggestLink = true;

				// If links exist already, we need to exclude the columns  
				// from the suggestions
				if(self.existingLinks.length > 0){
					//log("have existing links");

					// Loop through the existing services and make sure that 
					// the suggested column doesn't have reconciliation data already
					for(var m=0; m<self.existingLinks.length; m++){

						// If the column already existing as an existing link, 
						// we don't want to suggest this link
						if(colName == self.existingLinks[m].columnName){
							//log("column '"+cols[i].name+"' has recon data already");
							suggestLink = false;
							return false;
						}
					}
				}

				// If links have been confirmed already, we need to exclude the columns  
				// from the suggestions
				if(self.confirmedLinks.length > 0){
					//log("have confirmed links");

					for(var n=0; n<self.confirmedLinks.length; n++){

						// If the column already existing as an existing link, 
						// we don't want to suggest this link
						if(colName == self.confirmedLinks[n].columnName){
							//log("column '"+cols[i].name+"' has been confirmed already");
							suggestLink = false;
							return false;
						}
					}
				}

				if(suggestLink){
					// Column name contains something we're looking for
					//log("Suggesting link..."+cols[i].name);

					// Create an object containing the column name and the service it 
					// has been suggested to use for reconciliation
					self.suggestedLinks.push({
						columnName:colName,
						service:service
					});

					return true;
				} else {
					return false;
				}
			}

		},


		/*
		 * buildResultObjects
		 * 
		 * Creates an array of "result" objects (which can be a mixture of columns that are yet to be 
		 * linked to services - and columns that already have existing reconciliation data), which 
		 * are used to store the reconciliation data in, and then used to finally display the reconciliation 
		 * results.
		 * 
		 * *** If you're comparing this to the way Refine reconciles, this function *used* 
		 * to guess the types of the values in the columns 
		 * using Refine's default "guess-types" command. But as we know what 
		 * types we're looking for already, we can skip this part of the reconciliation 
		 * process and begin to reconcile immediately. ***
		 * 
		 * TODO: Needs some work.
		 */
		buildResultObjects:function(){

			//log("buildResultObjects");

			var self = this;

			// Save the restore point so the user can cancel at any point and return 
			// to the previous state in one step.
			try{
				self.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.historyRestoreID = 0;
			}	

			/*
			 * Remove all facets as we use the number of facets to calculate
			 * what stage we're at when reconciling.
			 */
			//ui.browsingEngine.remove();

			/*
			 * Display a new panel that shows the results / scores of 
			 * attempting reconciliation on the confirmed columns.
			 */
			self.results = [];

			// Add the existing links to the results
			if(self.existingLinks.length > 0){

				/*
				 * Iterate through the existing links array and create "result" objects
				 * for the columns to exist along side the new reconciliation results.
				 * 
				 * We also need to add the existing link's reconcilation service to the 
				 * reconciliation manager
				 */
				for(var k=0; k<self.existingLinks.length; k++){

					// Find an existing service and use it
					for(var l=0; l<LG.vars.reconServices.length; l++){
						if(self.existingLinks[k].serviceName == LG.vars.reconServices[l].serviceName 
								&& typeof LG.vars.reconServices[l].id != 'undefined'){
							// Create a result - including the column name and it's 
							// matched service.

							//log("Creating existing result for column "+self.existingLinks[k].columnName);

							var result = {
									columnName:self.existingLinks[k].columnName,
									columnIndex:Refine.columnNameToColumnIndex(self.existingLinks[k].columnName),
									service:LG.vars.reconServices[l],
									existingLink:true
							};

							// Remove the link from the confirmedLinks array
							self.existingLinks.splice(k,1);
							k--;

							// Add the result to the array of results
							self.results.push(result);

							l = LG.vars.reconServices.length-1;

						} else if(l == LG.vars.reconServices.length-1){

							//log("Adding service for column: "+self.existingLinks[k].columnName);

							LG.addReconciliationService(self.existingLinks[k].service, 0, function(service){

								for(var m=0; m<self.existingLinks.length; m++){

									// We don't actually add the correct service for the existing
									// link's column - but it doesn't matter
									// TODO: Take a look at avoiding this.
									if(service === self.existingLinks[m].service){

										// Create a result - including the column name and it's 
										// matched service.
										var result = {
												columnName:self.existingLinks[m].columnName,
												columnIndex:Refine.columnNameToColumnIndex(self.existingLinks[m].columnName),
												service:service,
												existingLink:true
										};

										// Remove the link from the confirmedLinks array
										self.existingLinks.splice(m,1);

										// Add the result to the array of results
										self.results.push(result);

										// Break from the loop
										m = self.existingLinks.length-1;

									}
								}
							});

							k--;
						}
					}
				}
			}

			// Add the newly confirmed links to the results
			if(self.confirmedLinks.length > 0){

				/*
				 * Iterate through the confirmed links, add each link's service to 
				 * the reconciliation manager, then as a callback, create a result object ready to be 
				 * populated with the reconciliation results and begin reconciliation once we've processed all 
				 * of the confirmed links.
				 */
				for(var i=0; i<self.confirmedLinks.length; i++){

					LG.addReconciliationService(self.confirmedLinks[i].service, 0, function(service){

						for(var j=0; j<self.confirmedLinks.length; j++){

							if(service.serviceName == self.confirmedLinks[j].service.serviceName){

								// Create a result - including the column name and it's 
								// matched service.
								var result = {
										columnName:self.confirmedLinks[j].columnName,
										columnIndex:Refine.columnNameToColumnIndex(self.confirmedLinks[j].columnName),
										service:service
								};

								// Remove the link from the confirmedLinks array
								self.confirmedLinks.splice(j,1);
								j--;

								// Add the result to the array of results
								self.results.push(result);

								// If we've processed every confirmed link then we can 
								// begin to reconcile
								if(self.confirmedLinks.length == 0){
									self.startReconcile();
								}
							}
						}
					});
				}
			} else {
				// Only existing links being viewed				
				self.startReconcile();
			}
		},

		/*
		 * startReconciliation
		 * 
		 * Iterates through the results array and commences Refine's 
		 * "reconcile" process which will continue to poll every second
		 * until reconciliation is complete.
		 * 
		 * It skips any "result" objects that are existing link as they have already 
		 * been reconciled.
		 */
		startReconcile:function(){

			//log("startReconcile");

			var self = this;

			// Initialise the processes array. We fill this with Refine's
			// running processes, so we can tell which ones have completed
			// and which are still running in order to give feedback to the user.
			self.processesArray = [];

			for(var i=0; i<self.results.length; i++){
				// Make sure the result is not an existing link, in which case it doesn't
				// need to be reconciled
				if(!self.results[i].existingLink){
					Refine.postCoreProcess(
							"reconcile",
							{},
							{
								columnName: self.results[i].columnName,
								config: JSON.stringify({
									mode: "standard-service",
									service: self.results[i].service.serviceURL,
									identifierSpace: "http://www.ietf.org/rfc/rfc3986",
									schemaSpace: "http://www.ietf.org/rfc/rfc3986",
									type: { id: self.results[i].service.resourceInfo.resourceURI, name: self.results[i].service.resourceInfo.resourceURI },
									autoMatch: true,
									columnDetails: []
								})
							},
							{ cellsChanged: true, columnStatsChanged: true },
							{}
					);
				}

				// Once we've iterated through the results, 
				// we can show the results panel while the reconcilaition continues
				if(i == self.results.length-1){
					self.displayReconciliationResult();
				}
			}
		},

		/*
		 * displayReconciliationResult
		 * 
		 * Displays the reconciliation results in the linking panel.
		 * 
		 */
		displayReconciliationResult: function(){

			//log("displayReconciliationResult");
			
			var self = this;
			
			// Boolean flag to avoid display results
			self.hasBeenCancelled = false;
			
			$("div#refine-tabs-facets").children().hide();

			// Initialise the number of running processes to 1
			// This will increase as the reconciliation begins.
			self.numberOfRunningProcesses = 1;

			var interval = setInterval(function(){

				try{
					// Update the progress bars while we wait for the reconciliation to finish
					self.pollReconciliationJobs();
				} catch(e){
					log(e);
					self.cancelAndReset();
					clearInterval(interval);
				}

				// Once all processes have finished
				if(self.numberOfRunningProcesses == 0 && !self.hasBeenCancelled){
					
					/*
					 * Checks that the facets have been created once reconciliation 
					 * has finished, so we can access the scores to display on the panel.
					 */
					self.checkFacetMatchCounts(function(){

						self.sortResultsByColumnIndex();

						// Make sure we have at least one result before 
						// continuing
						if(self.results.length > 0){

							// Remove any results in the panel
							$("div.linking-results div.result").remove();

							// Reset the existing links
							self.existingLinks = [];

							// Hide the loading gif
							$("p.loader").hide();

							// Iterate through the results and begin to construct the HTML for the result panel
							for(var i=0; i<self.results.length; i++){

								// Add the header and body to the result div
								var div = $("<div />").addClass("description result")
								.data("serviceUrl", encodeURIComponent(self.results[i].service.serviceURL))
								.data("colName", self.results[i].columnName);								

								// Add the header of the result panel
								var header = $("<a />").addClass("colName")
								.text(self.results[i].columnName);

								var resultBody = $("<div />").addClass("result-body");

								// Add a link to the reconciled value type
								var type = $("<p />").addClass("value-type")
								.append("<span>Type</span>");

								$("<a />")
								.attr("href",self.results[i].service.resourceInfo.resourceURI)
								.attr("target","_blank")
								.text(self.results[i].service.serviceName)
								.appendTo(type);

								// Add the count and percentage statistics
								var matches = $("<p />").addClass("matches")
								.appendTo(resultBody);

								matches.append("<span>Matches</span>");

								$("<span />").addClass("matched")
								.text(theProject.rowModel.total-self.results[i].numUnmatched)
								.appendTo(matches);

								matches.append(" / ");

								$("<span />").addClass("total")
								.text(theProject.rowModel.total)
								.appendTo(matches);

								var percent = Math.round((((theProject.rowModel.total-self.results[i].numUnmatched)/theProject.rowModel.total)*100));
								$("<span />").addClass("percentage")
								.text(" ("+percent+"%)")
								.appendTo(matches);

								// Add the progress bar
								var progressBarValue = $("<div />").addClass("ui-progressbar-value");
								$("<div />").addClass("matches-bar ui-progressbar")						
								.append(progressBarValue)
								.appendTo(resultBody);

								// Add a message asking the user if they want to 
								// try to manually search for the values if there are 
								// some that are unmatched.
								if(self.results[i].numUnmatched > 0 || self.results[i].numMatched < theProject.rowModel.total){

									$("<p />")
									.addClass("notification note")
									.html("There are some values that have not been matched due to possible differences " +
									"in punctuation or spellings. Would you like to try to match these values yourself?")
									.appendTo(resultBody);

									$("<p />")
									.addClass("notification options")
									.append("<a class='yes button'>Yes</a>")
									.append("<a class='ignore button'>Ignore</a>")
									.appendTo(resultBody);

								}

								// Add the "Clear reconciliation data" button
								$("<p />")
								.addClass("notification clearReconData")
								.append("<a class='clear button'>Clear reconciliation data</a>")
								.appendTo(resultBody);

								// Add the result to the results panel
								div.append(header);
								div.append(resultBody);
								self.results[i]._div = div;
								$("div.linking-results").append(div);

							}
						} else {
							//log("displayReconciliationResult - shouldn't ever get here...");
							var div = $("<div class='description' />").append($("<p>No results!</p>"));
							$("div.linking-results").append(div);
						}

						/*
						 * Interaction for the "yes" button when a result contains 
						 * unmatched values
						 */
						$("div.result div.result-body p a.yes").click(function(){

							var resultDiv = $(this).parent("p").parent("div").parent('div');
							resultDiv.find("p.note, p.options").hide();
							resultDiv.find("p.suggestinput").css("visibility","visible");

							// Build a list of inputs containing unmatched values for the user to manually 
							// search for each of their reconcilable values. Finally display the list as the 
							// callback.
							self.makeListOfUnmatchedValues(resultDiv, function(){
								// Show the list
								resultDiv.find("ul.selected-columns").show();
							});
						});

						/*
						 * Interaction for the "yes" button when a result contains 
						 * unmatched values
						 */
						$("div.result div.result-body p.clearReconData a.clear").click(function(){

							var resultDiv = $(this).parent("p").parent("div").parent('div');
							var colName = resultDiv.data("colName");

							// Create the dialog itself
							var dialog = LG.createDialog({
								header:"Are you sure?",
								body:"This will delete the reconciliation data for the column \""+colName+"\"",
								ok:function(){
									DialogSystem.dismissAll();	
									self.removeColumnReconciliation(colName, function(colName){

										// 2. Remove the column from the existing links if it exists
										for(var i=0; i<self.existingLinks.length; i++){
											if(self.existingLinks[i].columnName == colName){
												self.existingLinks[i]._li.remove();
												self.existingLinks.splice(i, 1);
												i--;
											}
										}

										// 3. Remove the column from the results if it exists
										for(var j=0; j<self.results.length; j++){

											if(self.results[j].columnName == colName){
												self.results[j]._div.remove();
												self.results.splice(j, 1);
												j--;
											}
										}

										if(self.results.length == 0){
											// Reset the confirmed links
											self.confirmedLinks = [];
											$("div.confirmed-links ul.confirmed-columns").html("").hide();
											// Hide the confirmed links <div>
											$("div.confirmed-links").hide();
											// Hide the confirmed links header
											$("div.suggest-panel h3.confirmed").hide();
											// Show the suggest panel
											self.showSuggestPanel();
											self.setupExistingLinks();
										} else {
											// Display the first result
											$("div.linking-results div.result a.colName").eq(0).click();
										}

									});
								},
								cancel:function(){
									DialogSystem.dismissAll();	
								},
								className:"confirm"
							});

							// Display the dialog
							DialogSystem.showDialog(dialog);

						});

						/*
						 * Inteaction for the "ignore" button when a result contains 
						 * unmatched values.
						 */
						$("div.result div.result-body p a.ignore").click(function(){
							var resultDiv = $(this).parent("p").parent("div").parent('div');
							resultDiv.find("p.note, p.options").hide();
						});

						Refine.update({modelsChanged:true}, function(){

							// Hide the "linking" loading message
							$("div#refine-tabs-facets").children().show();

							//LG.showWizardProgress(false);

							// Once the lists of unmatched values are built and on show,
							// we can hide the loading panel and show the results panel.
							$("div.linking-loading").hide();
							$("div.linking-results").show();

							// Display the first result
							$("div.linking-results div.result a.colName").eq(0).click();

							// Make sure the Typing panel is showing
							$("div#left-panel div.refine-tabs").tabs('select', 1);
														
							// Show the save button
							self.els.saveButton.show();

						});


					});

					clearInterval(interval);

				} else if(self.hasBeenCancelled){
					// Cancellation has already begun
					clearInterval(interval);
				} else {
					/*
					 * Make sure the Typing panel is showing as Refine will try to 
					 * display facets after reconciliation
					 */
					$("div#left-panel div.refine-tabs").tabs('select', 1);
				}
			},500);
		},

		/*
		 * removeColumnReconciliation
		 * 
		 * Clears the reconciliation data from the cells in Refine, 
		 * as well as removing the column's RDF.
		 */
		removeColumnReconciliation:function(columnName, callback){

			var self = this;

			// 1. Delete the reconciliation data for the column
			Refine.postCoreProcess(
					"recon-discard-judgments",
					{ columnName: columnName, clearData: true },
					null,
					{ cellsChanged: true, columnStatsChanged: true }
			);

			// 4. Remove the columns reconciliation RDF data
			LG.rdfOps.removeColumnInRDF(columnName);

			// 5. Perform any UI clean up
			Refine.update({modelsChanged:true}, function(){
				callback(columnName);
			});

		},
		
		sortResultsByColumnIndex: function(){
			var self = this;
			return self.results.sort(function(a, b){
				var obj1key = a["columnIndex"];
				var obj2key = b["columnIndex"]; 
				return ((obj1key < obj2key) ? -1 : ((obj1key > obj2key) ? 1 : 0));
			});
		},

		/*
		 * updateMatches
		 * 
		 * Updates the progress bar and the percentage of matched/unmatched values.
		 * 
		 * Takes a result panel <div> to know which result to update the progress bar of.
		 * 
		 * TODO: Store the result <div> inside the result's object as a bound element.
		 */
		updateMatches:function(resultDiv){

			//log("updateMatches");
			var self = this;

			// Total number of rows
			var total = theProject.rowModel.total;
			// Declare number of values matched as 0
			var matched = 0;
			// Store the column name
			var colName = $(resultDiv).data("colName");
			// Store the expression used to create the facet - telling us
			// how many values have been matched
			var expression = 'forNonBlank(cell.recon.judgment, v, v, if(isNonBlank(value), "(unreconciled)", "(blank)"))';
			// The facet parameter object
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : colName,
						"columnName" : colName,
						"expression" : expression,
						"omitBlank" : false,
						"omitError" : false,
						"selection" : [],
						"selectBlank" : false,
						"selectError" : false,
						"invert" : false
					} ],
					"mode" : "row-based"
			};

			// Simulate a facet to compute the matched/unmatched values using
			// the expression above. We can then present a percentage and a progress bar.
			$.ajax({
				async : false,
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams),
					project : theProject.id
				},
				success : function(data){
					for ( var i = 0; i < data.facets.length; i++) {
						// If the facet matches the column name and has
						// choices returned
						if (data.facets[i].columnName == colName  
								&& typeof data.facets[i].choices != 'undefined') {
							// Loop through the choices until we have found the "matched" choice
							for(var j=0; j<data.facets[i].choices.length; j++){
								if(data.facets[i].choices[j].v.v == "matched"){
									// Store the number of matched values
									matched = data.facets[i].choices[j].c;
									// Create a percentage
									var percentage = Math.round(((matched/total)*100));
									// Update the HTML in the panel
									$(resultDiv).find("p.matches").find("span.matched").text(matched);
									$(resultDiv).find("p.matches").find("span.percentage").text(" ("+percentage+"%)");

									var progressBarValue = $(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value");
									progressBarValue.css("width",percentage+"%");
									progressBarValue.removeClass("green").removeClass("yellow").removeClass("red");

									// Colour the progress bar accordingly
									if(percentage > 66){
										progressBarValue.addClass("green");
									} else if(percentage > 33){
										progressBarValue.addClass("yellow");
									} else {
										progressBarValue.addClass("red");
									}
								}
							}
						}
					}
				},
				error : function() {
					LG.alert("updateMatches() - A problem was encountered when computing facets.");
				}
			});	
		},

		/*
		 * makeListOfUnmatchedValues
		 * 
		 * Builds a <ul> list of values and inputs for the user to manually search for their 
		 * correct representations against a service endpoint.
		 * 
		 * The result panel <div> element is passed to the function, so we know where to inject
		 * the list once it's built.
		 * 
		 * Also builds annd sets up the suggestPane.
		 * 
		 * TODO: This needs pagination / a cut-off point.
		 * TODO: Store the result <div> inside the result's object as a bound variable
		 * 
		 * resultDiv - the HTML <div> to inject the HTML into
		 * callback - the function to execute once this has finished. Called multiple times
		 * within the loop
		 */
		makeListOfUnmatchedValues: function(resultDiv, callback){

			//log("makeListOfUnmatchedValues");

			var self = this;
			// The expression used to produce a facet of values that haven't been
			// reconciled.
			var expression = "if(cell.recon.matched,blank,value)";

			// The column name
			var colName = $(resultDiv).data("colName");

			// The endpoint's URL
			var serviceURL = decodeURIComponent($(resultDiv).data("serviceUrl"));

			// Call a generic function to compute a facet on a column given a particular 
			// expression.
			LG.ops.computeColumnFacet(colName, expression, function(data){

				// Loop through the facets
				for ( var i = 0; i < data.facets.length; i++) {

					// If the facet matches the column name,
					// is not either of the reconciliation facets - 
					// and has choices returned
					if (data.facets[i].columnName == colName 
							&& data.facets[i].name.indexOf("judgment") < 0 
							&& data.facets[i].name.indexOf("candidate") < 0 
							&& typeof data.facets[i].choices != 'undefined') {

						// Loop through the returned facet choices (count)-number of times
						// and insert them into an array in order of the most frequently occuring.
						var highest = 0;
						var choices = data.facets[i].choices;
						var arrayOfUnmatchedValues = [];

						for(var j=0; j<choices.length; j++){

							if(choices[j].c >= highest){
								// Add the chosen value to the front of the array
								// because it occurs more frequently than the previous
								// value.
								arrayOfUnmatchedValues.splice(0,0,{
									name:choices[j].v.l,
									count:choices[j].c
								});
								highest = choices[j].c;
							} else {
								// Add the value to the end of the array.
								arrayOfUnmatchedValues.push({
									name:choices[j].v.l,
									count:choices[j].c
								});
							}
						}

						// Construct the UL list of LI input elements
						var ul = $("<ul />").addClass("selected-columns text-input");

						// The limit for the number of input boxes that will be created
						// for searching
						var inputElementLimit = 30;

						for(var i=0; i<arrayOfUnmatchedValues.length; i++){
							// Make sure not to create more than the limit
							if(i < inputElementLimit){

								// We use "col" to inherit CSS styling, it's actually
								// a cell value - not a column name
								var spanCol = $("<span />").addClass("value col")
								.data("value", arrayOfUnmatchedValues[i].name)
								.text(arrayOfUnmatchedValues[i].name+" ("+arrayOfUnmatchedValues[i].count+")");

								// We attach the column name to the input element
								// so the click handler for the input box can pass on 
								// the column name to Refine's reconcile-value process call
								// as a parameter.
								var suggestBox = $("<input />").addClass("suggestbox textbox")
								.attr("type","text")
								.data("colName", colName);

								var spanColOptions = $("<span />").addClass("colOptions")
								.append(suggestBox);

								var li = $("<li />")
								.append(spanCol)
								.append(spanColOptions);

								ul.append(li);

							} else {
								// We've created the maximum number of input boxes we want to
								i == arrayOfUnmatchedValues.length-1;
							}
						}

						ul.children("li").eq(ul.children("li").length-1).addClass("last");
						
						// Insert the HTML into the correct result panel <div>
						$(resultDiv).find("div.result-body").append(ul);

						// Create the suggest and preview panes for searching and previewing
						// entities against the endpoints.
						self.suggestPane = $("<div />").attr("id","suggest-pane");
						self.previewPane = $("<div />").attr("id","preview-pane");
						$("body").append(self.suggestPane);
						$("body").append(self.previewPane);

						/*
						 * Iterate through the list of unmatched values and initialise each of their <input> elements  
						 * using the autosuggestion feature
						 */
						$(resultDiv).find("div.result-body").find("ul.selected-columns").children("li").each(function(){
							// We pass the input element, the unmatched value and the endpoints URL
							self.setUpSearchBox($(this).find("input.suggestbox"), $(this).find("span.col").data("value"), serviceURL);
						});

						// Set up and build the suggestPane
						self.suggestPane.html(
								"<div class='searching'>Searching...</div>" +
								"<div class='options'>" +
								"<span class='text'>Only select a match if you are 100% sure it is correct.</span>" +
								"<a class='button'>I&apos;m not sure</a>" +
								"</div>" +
								"<div class='noresults'><p>No results</p></div>"
						);						

						// Interaction for the "I'm not sure" button.
						// The user might not be able to find any values to match to the unmatched value, 
						// so we need to offer them an option to say they can't find the value - or they 
						// are not 100% sure
						self.suggestPane.find("div.options a").click(function(){
							var inputElement = self.suggestPane.data("inputElement");
							log(inputElement);
							// Replace the input element with it's unmatched value
							inputElement.val(inputElement.parent().parent().find("span.col").data("value"));
							// Apply a greyed-out CSS style
							inputElement.addClass("dontknow");
							// We need to remove any reconciliation data for the unmatched value
							self.discardReconValues(inputElement.data("colName"), inputElement.val());
							// Hide the suggest and preview panes
							self.suggestPane.hide();
							self.previewPane.hide();
						});

						if(callback){
							callback();
						}
					}
				}
			});
		},

		/*
		 * checkFacetMatchCounts
		 * 
		 * Stores the number of matched values returned by reconciliation in a 
		 * result object
		 */
		checkFacetMatchCounts: function(callback){

			//log("checkFacetMatchCounts");

			var self = this;

			// Expression used for facet
			var expression = 'forNonBlank(cell.recon.judgment, v, v, if(isNonBlank(value), "(unreconciled)", "(blank)"))';

			// Loop through each result
			for(var k=0; k<self.results.length; k++){
				// Call our generic faceting function using a column name and an expression.
				// This returns counts of values that have been matched & unmatched during 
				// reconciliation.
				LG.ops.computeColumnFacet(self.results[k].columnName, expression, function(data){
					// Loop through the returned facet data
					for(var i=0; i<data.facets.length; i++) {						
						// If the facet matches the column name and isn't one of the 
						// reconciliation facets and has choices returned
						if (data.facets[i].columnName == self.results[k].columnName 
								&& data.facets[i].name.indexOf("judgment") < 0 
								&& data.facets[i].name.indexOf("candidate") < 0 
								&& typeof data.facets[i].choices != 'undefined') {

							// Store the choices
							var choices = data.facets[i].choices;

							// Find the number of unmatched and matched values and 
							// store the counts in the result object
							for(var j=0; j<choices.length; j++){
								if(choices[j].v.v == "none"){
									self.results[k].numUnmatched = choices[j].c;
								} else if(choices[j].v.v == "matched"){
									self.results[k].numMatched = choices[j].c;								
								}
							}
						}
					}

				}); // end ops

				if(k == self.results.length-1) {
					callback();
				}
			} // end for 

		},


		/*
		 * setUpSearchBox
		 * 
		 * For an input elements created in the list of values that haven't 
		 * been matched during reconciliation, we attach key and focus listeners to the 
		 * inputs to feed the autosuggestion feature which queries the service's endpoint.
		 * 
		 * Takes the input element, the original unmatched value and the endpoint URL
		 * 
		 * TODO: We are call this function for every single input box instead of using event 
		 * delegation once.
		 * - Seems to be an issue with using .live()...
		 */
		setUpSearchBox:function(inputElement, unmatchedValue, serviceURL){

			//log('setUpSearchBox');

			var self = this;

			// Find the service's suggest options using it's URL
			var suggestOptions;
			for(var i=0; i<ReconciliationManager.standardServices.length;i++){

				//log("ReconciliationManager.standardServices[i].url = "+ReconciliationManager.standardServices[i].url);
				//log("serviceURL = "+serviceURL);

				if(ReconciliationManager.standardServices[i].url == serviceURL){
					suggestOptions = ReconciliationManager.standardServices[i].suggest.entity;
				}
			}

			//log("suggestOptions");
			//log(suggestOptions);

			// Create an AJAX object for the suggest pane. We can specifically choose 
			// to abort this AJAX call this way
			self.suggestXHR = {
					abort:function(){}
			};

			// Bind "focus" and "keyup" listeners to the input element - allow us 
			// to provide autosuggestions.
			// TODO: Too much happening/being created on every keystroke!
			// Just use a one-off element that listens through delegation
			inputElement
			.attr("value", unmatchedValue)
			.bind("focus", function(){
				// Reposition the suggest pane when a user clicks on 
				// an input element
				self.suggestPane.css("left", inputElement.offset().left + "px");
				self.suggestPane.css("top", (inputElement.offset().top + 25) + "px");
				self.suggestPane.data("inputElement", $(this));
			})
			.bind("keyup",function(){

				// Change the look of the input to edit-mode
				$(this).removeClass("matched").removeClass("dontknow").addClass("edited");

				// If there's text in the input box
				if(inputElement.val().length > 0){

					// Show the suggest pane with "Searching..." with an indicator 
					self.suggestPane.find("ul").hide();
					self.suggestPane.find("div.options").hide();
					self.suggestPane.find("div.noresults").hide();
					self.suggestPane.find("div.searching").show();
					self.suggestPane.show();

					// Add an on "click" listener to the body <div>, so 
					// that when the user clicks anywhere on the page apart from
					// the suggest pane - the suggest pane is hidden.
					// We then remove this on "click" listener once the suggest pane 
					// has been hidden.
					$("div#body").bind("click",function(){
						self.suggestPane.hide();
						self.previewPane.hide();
						$("div#body").unbind("click");
					});

					// Cancel the current AJAX request regardless if there is one
					self.suggestXHR.abort();

					// Check the suggest cache for the request
					if(typeof self.suggestCache[inputElement.val().toLowerCase()] == 'undefined'){

						// Given there's no cache entry, call the suggest entity service 
						// using the service's local "flyout" paths (e.g. /suggest/entity/my-service-1/)
						self.suggestXHR = $.ajax({
							type : "GET",
							url : suggestOptions.service_url+suggestOptions.service_path+"?callback=?",
							data : {
								all_types:false,
								prefix: inputElement.val().toLowerCase(),
								type:"",
								type_strict:"all"
							},
							dataType:"json",
							async:true,
							success : function(data) {
								// If we have a result
								if(typeof data.result != 'undefined' && data.result.length > 0){
									// Pass a number of variables to help construct the list of suggestions
									self.buildSuggestionList(data, inputElement, unmatchedValue, serviceURL, suggestOptions);
								} else {
									// If we're not returned anything from the suggest AJAX call
									//self.suggestPane.html('<div class="options"><span class="text">Only select a match if you are 100% sure it is correct.</span><a class="button">I&apos;m not sure</a><p>No results...</p></div>').show();
									//log("We have no suggestions");
									// Display a "no results" message with the "I'm not sure" button
									self.suggestPane.find("ul").hide();
									self.suggestPane.find("div.options").show();
									self.suggestPane.find("div.noresults").show();
									self.suggestPane.find("div.searching").hide();
									self.suggestPane.show();
								}

								// Store the returned data in the cache using the query term as a 
								// key.
								self.suggestCache[inputElement.val().toLowerCase()] = data;
								// Keep the cache size down.
								LG.ops.trimObject(self.suggestCache, 100);

							},
							error : function() {
								log("Error fetching suggest entity");
								//self.suggestPane.html('<div class="options"><span class="text">Only select a match if you are 100% sure it is correct.</span><a class="button">I&apos;m not sure</a><p>No results...</p></div>').show();
								// Display a "no results" message with the "I'm not sure" button
								self.suggestPane.find("ul").hide();
								self.suggestPane.find("div.options").show();
								self.suggestPane.find("div.noresults").show();
								self.suggestPane.find("div.searching").hide();
								self.suggestPane.show();
							}
						});
					} else {
						// If we have a cached result, pass the cached result to the list-building function 
						// instead of the AJAX returned data.
						var data = self.suggestCache[inputElement.val().toLowerCase()];
						self.buildSuggestionList(data, inputElement, unmatchedValue, serviceURL, suggestOptions);
					}
				} else {
					// If there's no text in the input box, hide the suggestion pane
					self.suggestPane.hide();
				}
			});



			return false;
		},

		/*
		 * buildSuggestionList
		 * 
		 * Constructs and injects a list of suggestions returned by the service endpoint once 
		 * a user has manually keyed in a value into an input box.
		 * 
		 * The is then displayed in the suggest pane.
		 */
		buildSuggestionList:function(data, inputElement, unmatchedValue, serviceURL, suggestOptions){

			//log("buildSuggestionList");

			var self = this;

			// Begin to construct the list
			var ul = $("<ul>").addClass("fbs-list");
			// Iterate through the suggestion results
			for(var i=0; i<data.result.length; i++){
				// Filter the suggestions by their URI patterns	
				// (i.e. for a UK department, we know we want entities whose URIs 
				// begin with "http://reference.data.gov.uk/id/department/")
				if(self.checkSuggestion(data.result[i].id, serviceURL)){

					// If the suggestion passed the filter test, continue to create it's list 
					// element
					var li = $("<li>").addClass("fbs-item");

					// Highlight the query letters within the returned result's name 
					// when displaying it in the list
					var name = data.result[i].name;

					if(name.indexOf(inputElement.val()) > -1){
						name = data.result[i].name.replace(inputElement.val(),"<strong>"+inputElement.val()+"</strong>");
					} else if(name.indexOf(inputElement.val().toLowerCase()) > -1){
						name = data.result[i].name.replace(inputElement.val().toLowerCase(),"<strong>"+inputElement.val().toLowerCase()+"</strong>");
					} else if(name.toLowerCase().indexOf(inputElement.val().toLowerCase()) > -1){
						//name = data.result[i].name.replace(inputElement.val().toLowerCase(),"<strong>"+inputElement.val().toLowerCase()+"</strong>");
						name = data.result[i].name.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } ).replace(inputElement.val().toLowerCase().replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } ),"<strong>"+inputElement.val().toLowerCase().replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } )+"</strong>");
					}
					
					li.html('<div class="fbs-item-name"><label>'+name+'</label></div>');

					// Attach the suggestion data to the list element
					li.data("suggest", data.result[i]);

					// Add an on "click" listener to the suggestion
					li.unbind("click").bind("click",function(){
						// When the suggestion is selected, hide the suggestion pane,
						// abort and hide the preview pane - and continue to match all cells 
						// with the originally unmatched value to the new suggested value.
						self.suggestPane.hide();
						self.previewXHR.abort();
						self.previewPane.hide();
						// Pass the suggestion <li> element, the input element and the original value
						self.matchCellsFromSearch($(this), inputElement, unmatchedValue, function(li, inputElement){

							// Once the cells have been matched, style and update the value inside the input element
							inputElement
							.val(li.data("suggest").name)
							.removeClass("edited")
							.removeClass("dontknow")
							.addClass("matched");

							// Update the progress bar for each result
							var resultDiv = inputElement.parent("span").parent("li").parent("ul").parent("div").parent("div");
							self.updateMatches(resultDiv);
						});
					}).hover(function(){
						// When hovering over the suggestion, produce a preview in the preview pane
						self.buildPreviewPane($(this), $(this).data("suggest"), suggestOptions);
					},function(){
						// Part of the hover-toggle listener, when not hovering over the suggestion, 
						// hide the preview pane
						self.previewPane.hide();
					});

					// Append the list element to our list
					ul.append(li);

				} else {
					// Suggested URI does not match what we're looking for
				}
			}

			// Hide the "searching" message once we've built our list of suggestions
			self.suggestPane.find("div.searching").hide();
			// Show the "options" <div> - this contains buttons for the suggestion pane
			self.suggestPane.find("div.options").show();
			if(ul.children("li").length < 1){
				self.suggestPane.find("div.noresults").show();
			}
			// Finally append the list of suggestions to the suggest pane
			self.suggestPane.find("ul").remove();
			self.suggestPane.append(ul);
			self.suggestPane.find("ul").show();

		},

		/*
		 * checkSuggestion
		 * 
		 * TODO: Ideally, the cache would infact be the 
		 * validated & constructed HTML instead of the raw response
		 * returned from the endpoint. This would save a lot of 
		 * validating/iterating etc.
		 * 
		 * Checks to see if a suggestion's URI path is 
		 * something we're looking for
		 */
		checkSuggestion:function(id, serviceURL){

			//log("checkSuggestion");

			var self = this;

			// Find service
			var services = LG.vars.reconServices;

			for(var j=0;j<services.length; j++){
				if(services[j].serviceURL === serviceURL){
					// We want to remove the slug from the URI
					id = id.substring(0,id.lastIndexOf("/")+1);
					/*
					 * If the resources URI path matches or there is no
					 * path to match against, then include it in the list
					 * by returning true
					 */ 
					if(id == services[j].resourceInfo.uriPath || typeof services[j].resourceInfo.uriPath == 'undefined'){
						return true;
					} else {
						return false;
					}
					j = services.length-1;
				}
			}
		},

		/*
		 * buildPreviewPane
		 * 
		 * Makes an AJAX request and displays a pane showing information 
		 * about an entity.
		 * 
		 * Depending on the service, we might want to show particular bits of information 
		 * to the user in order to help them decide which suggested entity to pick.
		 * 
		 * Usually rdfs:label and rdfs:comment properties suffice, but when they don't, we 
		 * need to show something else.
		 * 
		 * TODO: Hook up to our own servlet with a list of description properties to keep an eye 
		 * out for.
		 */
		buildPreviewPane:function(li, suggest, suggestOptions){

			//log("buildPreviewPane");

			var self = this;

			self.previewPane.html("<p class='name'>Loading...</p>");
			self.previewPane.css("top",(li.offset().top)+"px");

			// Check cache for request
			if(typeof self.previewCache[suggest.id] == 'undefined'){
				// Begin the AJAX request, storing the XHR object in a global 
				// varible so it can be aborted.
				self.previewXHR = $.ajax({
					type : "GET",
					url : suggestOptions.flyout_service_url+suggestOptions.flyout_service_path+"?callback=?",
					data : {
						id:suggest.id
					},
					dataType:"json",
					async:true,
					success : function(data) {

						// If the response contains the HTML object, we can continue 
						// to build the preview pane
						if(typeof data.html != 'undefined'){
							self.buildPreviewHTML(data, suggest);
						}
					},
					error : function() {
						log("Error fetching preview entity");
					}
				});

			} else {
				var data = self.previewCache[suggest.id];
				self.buildPreviewHTML(data, suggest);
			}

		},

		/*
		 * buildPreviewHTML
		 * 
		 * Constructs the HTML for the preview pane
		 */
		buildPreviewHTML:function(data, suggest){

			var self = this;

			self.previewPane.html("");

			$("<p />").addClass("name").text(suggest.name).appendTo(self.previewPane);

			var desc = $("<div />").append(data.html);

			// Depending on the description returned, we can 
			// handle little or no information by displaying something appropriate
			if(typeof suggest.description != 'undefined'){
				$("<p />").addClass("desc").text(suggest.description).appendTo(self.previewPane);
			} else if(desc.find("div.resource_preview_description").length > 0){
				$("<p />").addClass("desc").text(desc.find("div.resource_preview_description").html()).appendTo(self.previewPane);
			} else {
				$("<p />").addClass("desc").text("No information available.").appendTo(self.previewPane);
			}

			// Inject the HTML and show the pane
			//self.previewPane.html(html);
			self.previewPane.show();
			// Store the result in the cache and trim it
			self.previewCache[suggest.id] = data;
			LG.ops.trimObject(self.previewCache, 100);

		},

		/*
		 * matchCellsFromSearch
		 * 
		 * On clicking on a suggestion in the suggestion pane, we invoke a 
		 * "match similar cells" call and style & update the input element once 
		 * matched.
		 */
		matchCellsFromSearch:function(li, inputElement, localValue, callback){

			//log('matchCellsFromSearch');

			var self = this;

			var match = li.data("suggest");

			if (match !== null) {

				// Construct the parameters to pass to the process call
				var params = {
						judgment: "matched",
						id: match.id,
						name: match.name,
						types:"",
						similarValue: localValue,
						columnName: inputElement.data("colName")
				};

				Refine.postCoreProcess(
						"recon-judge-similar-cells", 
						{} || {}, 
						params,
						{ cellsChanged: true, columnStatsChanged: true},
						{
							onDone:function(){
								// Style and update the input element.
								callback(li, inputElement);
							}
						}
				);
			} else {
				log("matchCellsFromSearch - no suggest data on input element when matching value");
				// TODO: What to do if this happens?
			}

		},

		/*
		 * discardReconValues
		 * 
		 * Removes reconciliation from values within a column
		 */
		discardReconValues:function(columnName, value, callback){

			//log('discardReconValues');

			var self = this;

			// Construct a parameter object
			var params = {
					columnName: columnName,
					judgment: "none",
					identifierSpace: "http://www.ietf.org/rfc/rfc3986",
					schemaSpace: "http://www.ietf.org/rfc/rfc3986",
					similarValue: value
			};

			Refine.postCoreProcess(
					"recon-judge-similar-cells", 
					{} || {}, 
					params,
					{ cellsChanged: true, columnStatsChanged: true},
					{
						onDone:function(){
							if(callback){
								callback();
							}
						}
					}
			);
		},


		/*
		 * generateColumnFacet
		 * 
		 * Given a column name, this will create and return 
		 * an array of values from the column given the expression passed to it.
		 * 
		 * TODO: Check for duplicate code in LG.ops
		 */
		generateColumnFacet : function(colName, expression, callback){

			//log('generateColumnFacet');

			LG.ops.computeColumnFacet(colName, expression, function(data){

				// Loop through the UI facets 
				for ( var i = 0; i < data.facets.length; i++) {

					// If the facet matches the column name and has
					// choices returned					 
					if (data.facets[i].columnName == colName 
							&& data.facets[i].name.indexOf("judgment") < 0 
							&& data.facets[i].name.indexOf("candidate") < 0 
							&& typeof data.facets[i].choices != 'undefined') {

						// Loop through the returned facet choices (count) number of times
						// and append them to the unordered list.
						var highest = 0;
						var choices = data.facets[i].choices;
						var choicesArray = [];

						for(var j=0; j<choices.length; j++){
							if(choices[j].c >= highest){
								choicesArray.splice(0,0,choices[j].v.l);
								highest = choices[j].c;
							} else {
								choicesArray.push(choices[j].v.l);
							}
						}

						callback(choicesArray);
					}
				}
			});

		},

		/*
		 * saveRDF
		 * 
		 * Saves the reconciled URIs in RDF.
		 * 
		 * Removes any existing reconciliation RDF for the column before adding the RDF 
		 * to the schema
		 */
		saveRDF:function(rootNode, newRootNode){

			//log("saveRDF");

			var self = this;

			// Iterate through the results, create each of their relevant 
			// RDF fragments and push them into the RDF schema onto the row's root node
			// after checking for and removing an existing reonciliation RDF fragment for 
			// the column
			for(var i=0; i<self.results.length; i++){

				// Build the RDF fragment and store it in the result object
				self.results[i].rdf = self.buildColumnReconciliationRDF(self.results[i]);

				// Check to see if the column already has reconciliation RDF present, 
				// in which case remove it as we are overriding it.
				for(var j=0; j<rootNode.links.length; j++){
					if(rootNode.links[j].target.columnName == self.results[i].columnName 
							&& typeof rootNode.links[j].target.expression != 'undefined'
								&& rootNode.links[j].target.expression == "if(isError(cell.recon.match.id),value,cell.recon.match.id)"){

						//log("Found reconciliation RDF for column "+rootNode.links[j].target.columnName);
						//log("Deleting...");

						rootNode.links.splice(j,1);
					}
				}

				// Push the resulting RDF into the RDF schema 
				rootNode.links.push(self.results[i].rdf);
				//log("Added recon RDF for column "+self.results[i].columnName);

			}

			// If it's a new root node, add it to the schema
			var schema = LG.rdfOps.getRDFSchema();
			if (!newRootNode) {
				log("RootNode has been updated...");
			} else {
				log("Adding first rootNode...");
				schema.rootNodes.push(rootNode);
			}

			// Save the RDF
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema : JSON.stringify(schema)
			}, {}, {
				onDone : function() {
					//LG.showFinishMessage();
					// TODO: What to do after pressing save?
					// Forward to the labelling panel?
					$("ul.lg-tabs li a[rel='labelling-panel']").click();
				}
			});
		},

		/*
		 * buildColumnReconciliationRDF
		 * 
		 * Gathers the URIs and CURIEs from the reconciliation service configuration object, 
		 * and uses them to build a fragment of RDF that we use to store the reconciled URI.
		 */
		buildColumnReconciliationRDF:function(result){

			//log("buildColumnReconciliationRDF");

			var self = this;

			// Add the results vocabulary to the schema
			var resourceInfo = result.service.resourceInfo;

			var resourceURI = resourceInfo.resourceURI;
			var resourceCURIE = escape(resourceInfo.resourceCURIE);
			var predicateURI = resourceInfo.predicateURI;
			var predicateCURIE = escape(resourceInfo.predicateCURIE);
			var vocabURI = resourceInfo.vocabURI;
			var vocabCURIE = resourceInfo.vocabCURIE;

			// Check to see if there is any predicate information, 
			// if there isn't, use the default project URI as a temporary
			// relationship to the reconciled URI (e.g. lg:columnName
			// instead of something like gov:hasDepartment).
			if(predicateURI.length < 1){
				predicateURI = self.vocabs.lg.uri+LG.urlifyColumnName(result.columnName);
				predicateCURIE = self.vocabs.lg.curie+":"+LG.urlifyColumnName(result.columnName);
			}

			// The RDF fragment makes use of a GREL expression to access the cells reconciled URI.
			var rdf = {
					"uri" : predicateURI,
					"curie" : predicateCURIE,
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression": "if(isError(cell.recon.match.id),value,cell.recon.match.id)",
						"columnName": result.columnName,
						"isRowNumberCell" : false,
						"rdfTypes":[
						            {
						            	"uri": vocabURI+resourceCURIE,
						            	"curie": vocabCURIE+":"+resourceCURIE
						            }
						            ],
						            "links":[
						                     {
						                    	 "uri":self.vocabs.rdfs.uri+"label",
						                    	 "curie":self.vocabs.rdfs.curie+":label",
						                    	 "target":{
						                    		 "nodeType":"cell-as-literal",
						                    		 "expression":"escape(value,'xml')",
						                    		 "columnName":result.columnName,
						                    		 "isRowNumberCell":false
						                    	 }
						                     }
						                     ]
					}
			};

			return rdf;
		}

}