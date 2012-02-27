/*
 * LinkingPanel
 * 
 * Appears when the user presses the "Next" button on the Typing panel.
 * 
 * Forces the user to check and label the columns as well as give each of them a 
 * short description - which is optional.
 * 
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
			self.els = ui.typingPanel._el;
			
			// A shortcut to the panel's body
			self.body = self.els.linkingPanel;
			
			// Declare the suggested links, confirmed links and result arrays
			self.suggestedLinks = [];
			self.confirmedLinks = [];
			self.results = [];
			
			// Initialise the suggest
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

			/*
			 * Unregister reconciliation services, then load the ones we want.
			 * 
			 * This is just to avoid a build-up of duplicate services.
			 * 
			 * TODO: Only for dev. Might not want to do this.
			 */
			ReconciliationManager.standardServices.length = 0;
			ReconciliationManager.customServices.length = 0;
			ReconciliationManager.save(function(){
				// After removing and saving 0 services, we load our 
				// array of our own services and store them in an object.
				$.getScript("extension/linkedgov/scripts/project/reconciliationServices.js", function(data){
					LG.vars.reconServices = eval('(' + data + ')');
				});
			});


			// Interaction for the "Suggest links" button
			$("div.suggest-links a.suggestButton").live("click",function(){
				self.els.linkButton.show();
				$(this).html("Suggesting...").addClass("selecting");
				$(this).after('<span class="column-selecting-icon"><img src="extension/linkedgov/images/column_selecting.gif" /></span>');
				self.suggestLinks();
				$("div.suggest-links a.clearButton").css("display","inline-block");
				$("div.suggest-links a.suggestButton").hide();
				$("div.possible-links h3.confirmed").hide();
				$("div.suggest-links.confirmed").hide();
				$("div.suggest-links.confirmed ul").html("");
			});

			// Interaction for the "Clear all" button
			$("div.suggest-links a.clearButton").live("click",function(){
				$("div.suggest-links a.clearButton").hide();
				$("div.possible-links h3.confirmed").hide();
				$("div.suggest-links.confirmed").hide();
				$("div.suggest-links ul").html("");
				$("div.suggest-links a.suggestButton").css("display","inline-block");
				$("div.suggest-links ul.selected-columns").hide();
				// Reset any suggested or confirmed links
				self.suggestedLinks = [];
				self.confirmedLinks = [];
				self.results = [];
			});

			// Interaction for the remove button in the column list
			$("div.possible-links ul.selected-columns li span.remove").live("click",function(){
				$(this).parent("li").slideUp(500,function(){
					var ul = $(this).parent("ul");
					$(this).remove();
					if(ul.children("li").length < 1){
						ul.parent("div").find("a.clearButton").hide();
						ul.parent("div").find("a.suggestButton").show();
						ul.hide();
					}
				});
			});

			// Interaction for result headers
			$("div.result a.col-name").live("click",function(){

				$("div.result div.result-body").slideUp();

				if($(this).parent("div").find("div.result-body").css("display") == "none"){
					$(this).parent("div").find("div.result-body").slideDown();
				}

				// Update the matches-bar
				self.updateMatches($(this).parent());
			});

			// Interaction for the "Link" button
			self.els.linkButton.click(function(){
				if(typeof self.confirmedLinks != 'undefined' && self.confirmedLinks.length > 0){

					// Show the reconcile panel

					// LG.showWizardProgress(true);
					self.buildProgressBars(function(){
						self.showResultPanel();
					});

				} else {
					alert("You need to confirm which columns you want to link. Click the 'Suggest links' button to see which columns might be linkable.");
				}

			});
			
			// Set up a temporary vocabulary for reconciliation that lets
			// us link together a reconciled value and a row in Refine.
			self.vocabs = {
					lgRecon:{
						uri:"http://data.linkedgov.org/reconciliation/predicate/",
						curie:"lgRecon"
					}
			};

			// Interaction for the "Save" button
			self.els.saveButton.click(function(){
				// Check the current schema like we do with wizards
				// but don't pass an object containing vocabulary configs.
				// This returns an already existing rootnode or a new one
				// with a boolean signalling so.
				LG.rdfOps.checkSchema(self.vocabs, function(rootNode, foundRootNode) {
					// Call the linking panel's saveRDF function
					self.saveRDF(rootNode, foundRootNode);
				});
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
		 * displayPanel
		 * 
		 * Shows and hides things so that 
		 * when the panel's tab is clicked on, it displays
		 * correctly.
		 */
		displayPanel: function(){

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
			/*
			 * Show buttons depending on what panel is 
			 * being shown
			 */
			if($("div.reconcile-panel").css("display") != "none"){
				// Show the save button
				this.els.saveButton.show();
				// Show the cancel button
				this.els.cancelButton.css("display","inline-block");	
				// Hide the link button
				this.els.linkButton.hide();
			} else {
				// Hide the save button
				this.els.saveButton.hide();
				// Hide the cancel button
				this.els.cancelButton.hide();	
				// Show the link button
				this.els.linkButton.show();
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
			// Show the link button
			this.els.linkButton.show();
			// Show the suggest panel
			this.els.linkingPanel.find("div.suggest-panel").show();
			// Hide the reconcile panel
			this.els.linkingPanel.find("div.reconcile-panel").hide();
		},

		/*
		 * showResultPanel
		 * 
		 * Shows the panel that displays the reconcilation results
		 */
		showResultPanel:function(){

			var self = this;

			// Hide the link button
			this.els.linkButton.hide();

			// Hide the suggest panel
			this.els.linkingPanel.find("div.suggest-panel").hide();

			// Show & set up the cancel button
			this.els.cancelButton.unbind("click").bind("click",function(){

				// Alert the user they will lose their reconciliation results if they 
				// press "Cancel".
				var ans = window.confirm("Are you sure? You will lose any un-saved reconciliation data.");
				
				if(ans){
					
					self.cancelReconciliation(function(){
						// After cancelling reconciliation, rollback the history to the saved 
						// restore point.
						LG.restoreHistory(self.historyRestoreID);
						
						// Use an interval to test whether the expected facets have been created from 
						// cancelling the reconciliation (2 per column)
						var interval = setInterval(function(){
							
							if(ui.browsingEngine._facets.length < (self.confirmedLinks.length*2)){
								// Facets haven't been created yet
							} else {
								// Facets have been created which means reconciliation has been 
								// finished cancelling.
								//
								// Remove each of the progress-bars for the columns
								$("div.linking-loading div.progressDiv").each(function(){
									$(this).remove();
								});
								
								// Reshow the facet panel children which were hidden at the start of 
								// reconciliation
								$("div#refine-tabs-facets").children().show();
								
								// Make sure the Typing panel is still showing as Refine attempts 
								// to switch to the facet panel when one is created
								$("div#left-panel div.refine-tabs").tabs('select', 1);
								
								// Show the initial "suggest panel"
								self.showSuggestPanel();
								
								// Hide the "wizard in progress" message
								// LG.showWizardProgress(false);

								clearInterval(interval);
							}
						},100);

					});
				} else {
					// Do nothing
				}
			})
			.css("display","inline-block");

			// Show the reconcile panel
			this.els.linkingPanel.find("div.reconcile-panel").show(0, function(){
				// Begin reconciliation on the confirmed columns
				self.reconcileColumns();					
			});
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

			var html = "";
			// Loop through the confirmed columns and create their own progress bar HTML
			for(var i=0;i<self.confirmedLinks.length;i++){

				html+= "<div class='progressDiv'>";
				html+= "<p class='columnName'>"+self.confirmedLinks[i].columnName+"</p>";
				html+= "<p class='service'>"+self.confirmedLinks[i].service.serviceName+"</p>";
				html+= "<div class='recon-bar ui-progressbar'><div class='ui-progressbar-value'></div></div>";
				html+= "</div>";

			}
			// Inject the HTML into the loading panel
			$("div.linking-loading").html($("div.linking-loading").html()+html);

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
		 */
		pollReconciliationJobs:function(){

			//log("pollReconciliationJobs");

			var self = this;

			$.get("/command/core/get-processes?" + $.param({ project: theProject.id }), null, function(data) {
				for(var i=0;i<data.processes.length;i++){
					if(data.processes[i].description.indexOf("Reconcile") >= 0){
						// The only way to detect which column each process is operating on is to 
						// strip the description of the process which includes the column name
						var columnName = data.processes[i].description.split("Reconcile cells in column ")[1].split(" to type")[0];
						self.updateProgressBar(columnName, data.processes[i].progress);
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

			//log("updateProgressBar");

			$("div.linking-loading").find("div.progressDiv").each(function(){
				if($(this).find("p.columnName").html() == columnName){
					$(this).find("div.ui-progressbar-value").css("width",percentage+"%");
				}
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

			$.post(
					"/command/core/cancel-processes?" + $.param({ project: theProject.id }), 
					null,
					function(o) {
						// After cancelling the processes, reset the arrays that were populated 
						// for the last reconciliation job.
						self.results = [];
						self.confirmedLinks = [];
						self.suggestedLinks = [];
						
						// Blank out & hide the result panel
						$("div.linking-results").hide();
						$("div.linking-results").html('<h3>Results</h3>');
						// Show the loading panel
						$("div.linking-loading").show();
						
						// Make sure the suggested columns are cleared
						$("div.suggest-links a.clearButton").click();
						
						// Make sure the empty list is hidden
						$("div.suggest-links ul.selected-columns").hide();
						
						// callback
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
			
			// Declare the arrays of suggested and confirmed links
			self.suggestedLinks = [];
			self.confirmedLinks = [];

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
						
						// Lowercase the column header, check for an instance of each hint
						if(cols[i].name.toLowerCase().indexOf(services[j].hints[k]) >= 0){
							
							// Column name contains something we're looking for
							// Create an object containing the column name and the service it 
							// has been suggested to use for reconciliation
							self.suggestedLinks.push({
								columnName:cols[i].name,
								service:services[j]
							});

							// Break out of the services loop
							j=services.length-1;
						}						
					}
				}
			}
			
			// Build and display a list of the suggested links
			if(self.suggestedLinks.length > 0){
				var html="";
				for(var i=0;i<self.suggestedLinks.length;i++){
					// The data-index property is used to record the index of the suggested link in the suggestedLinks array.
					// When a user confirms the link, we copy the link at that index from the suggestedLinks array into the confirmedLinks array.
					html+="<li data-index='"+i+"'><span class='col'>"+self.suggestedLinks[i].columnName+"</span><span class='remove'>X</span><span class='confirm'>C</span><span class='link'>"+self.suggestedLinks[i].service.serviceName+"</span></li>";
				}
				$("div.suggest-links ul.selected-columns").html(html).css("display","block");
			} else {
				$("div.suggest-links ul.selected-columns").html("<li class='none'>None...</li>").css("display","block");
			}
			
			// Return the "Suggest links" button back to normal / remove it
			// TODO: This happens so fast, the user cannot see it, but when 
			// we use faceting to assess what values are in each column to provide us with a better , the need for a 
			// busy indicator will be needed. So leaving this code here for now.
			$("div.suggest-links a.suggestButton").html("Suggest links").removeClass("selecting");
			$("div.suggest-links span.column-selecting-icon").remove();

			$("div.suggest-links span.confirm").click(function(){

				// Add the confirmed suggestion to a new object containing only confirmations
				self.confirmedLinks.push(self.suggestedLinks[parseInt($(this).parent().attr("data-index"))]);

				// Add column to confirmed list
				$("ul.confirmed-columns").append('<li><span class="col">'+$(this).parent().find("span.col").html()+'</span><span class="link">'+$(this).parent().find("span.link").html()+'</span></li>');
				// Show list
				$("div.suggest-links.confirmed").show();
				// Show confirmed header
				$("div.possible-links h3.confirmed").show();
				// Remove column from suggested list
				$(this).parent("li").slideUp(500,function(){
					var ul = $(this).parent()
					$("ul.confirmed-columns li:last").slideDown(500);
					$(this).remove();
					// Hide the selected-columns list if there are none left (removes their 
					// margin-gap
					if(ul.children("li").length < 1){
						ul.hide();
					}
				});
			});
		},


		/*
		 * reconcileColumns
		 * 
		 * *** This used to guess the types of the values in the columns 
		 * using Refine's default "guess-types" command. But as we know what 
		 * types we're looking for already, we can skip this part of the reconciliation 
		 * process and begin to reconcile immediately. ***
		 * 
		 * Here we add each service that has been confirmed by the user to the 
		 * ReconciliationManager.
		 * 
		 * The callback of adding each service to the ReconciliationManager is to create a 
		 * result object that contains the column name, service and guessing-success. As we don't
		 * need to rely on Refine's judgment of values, we can use falsify the score and count for 
		 * the time being.
		 * 
		 */
		reconcileColumns:function(){

			//log("reconcileColumns");
			
			var self = this;

			// Save the restore point so the user can cancel at any point
			try{
				self.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.historyRestoreID = 0;
			}	

			/*
			 * Remove all facets as we use the number of facets to calculate
			 * what stage we're at when reconciling.
			 */
			ui.browsingEngine.remove();

			/*
			 * Display a new panel that shows the results / scores of 
			 * attempting reconciliation on the confirmed columns.
			 */
			var links = self.confirmedLinks;
			self.results = [];

			/*
			 * Iterate through the confirmed links, add each link's service to 
			 * the reconciliation manager, then as a callback, create a result object ready to be 
			 * populated with the reconciliation results and begin reconciliation once we've processed all 
			 * of the confirmed links.
			 */
			for(var i=0; i<self.confirmedLinks.length; i++){
				
				LG.addReconciliationService(self.confirmedLinks[i].service, 0, function(service){

					for(var j=0; j<self.confirmedLinks.length; j++){
						
						if(service === self.confirmedLinks[j].service){
							
							// Create a result - including the column name and it's 
							// matched service.
							var result = {
									columnName:self.confirmedLinks[j].columnName,
									service:service
							};

							// Remove the link from the confirmedLinks array
							self.confirmedLinks.splice(j,1);

							// Add the result to the array of results
							self.results.push(result);

							// Break from the loop
							j = self.confirmedLinks.length-1;

							// If we've processed every confirmed link then we can 
							// begin to reconcile
							if(self.confirmedLinks.length == 0){
								self.startReconcile();
							}
						}
					}
				});

			}

		},

		/*
		 * startReconciliation
		 * 
		 * Iterates through the results array and commences Refine's 
		 * "reconcile" process which will continue to poll every second
		 * until reconciliation is complete.
		 */
		startReconcile:function(){

			//log("startReconcile");

			var self = this;

			for(var i=0; i<self.results.length; i++){
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
		 * 
		 */
		displayReconciliationResult: function(){

			//log("displayReconciliationResult");

			var self = this;
			$("div#refine-tabs-facets").children().hide();

			/*
			 * Wait for the facets to be created (our signal that reconciliation 
			 * has finished).
			 * 
			 * Grab some information from the facets
			 * 
			 * Hide the facets 
			 */
			var interval = setInterval(function(){

				/*
				 * Update the progress bars while we wait for the reconciliation to finish
				 */
				self.pollReconciliationJobs();

				/*
				 * Reconciliation produces two facets per column once it's complete.
				 * 
				 * Our test for checking whether reconciliation has finished across all 
				 * columns is once all the facets have been created.
				 */			
				if(ui.browsingEngine._facets.length > (self.results.length*2)-1){

					/*
					 * Checks that the facets have been created once reconciliation 
					 * has finished, so we can access the scores to display on the panel.
					 */
					self.checkFacetMatchCounts(function(){

						// Make sure we have at least one result before 
						// continuing
						if(self.results.length > 0){

							// Iterate through the results and begin to construct the HTML for the result panel
							for(var i=0; i<self.results.length; i++){
								
								var html = "";

								// This used to be a test case to check that a column 
								// had it's values matched to a particular type - but we're skipping this stage
								// ("guess-types" command) and reconciling the values straight away.
								//if(self.results[i].matched){
									
									html += "<div class='description result'>";
									// We store the endpoint URL using the "data-" attribute so we can access this later
									html += "<a class='col-name' data-serviceurl='"+self.results[i].service.serviceURL+"'>"+self.results[i].columnName+"</a>";
									html += "<div class='result-body'>";
									
									html += "<p class='value-type'>" +
									"<span>Type</span>" +
									"<a href='"+self.results[i].service.resourceInfo.resourceURI+"' target='_blank'>"+self.results[i].service.serviceName+"</a>" +
									"</p>";
									
									// Calculate the percentage of matched values
									html += "<p class='matches'>" +
									"<span>Matches</span>" +
									"<span class='matched'>"+(theProject.rowModel.total-self.results[i].numUnmatched)+"</span> / " +
									"<span class='total'>"+theProject.rowModel.total+"</span> (<span class='percentage'>"+
									Math.round((((theProject.rowModel.total-self.results[i].numUnmatched)/theProject.rowModel.total)*100))+"</span>%)</p>";
						
									// The progress bar HTML
									html += '<div class="matches-bar ui-progressbar"><div class="ui-progressbar-value"></div></div>';
									
									// Display the buttons "Yes" and "Ignore" depending on whether there are values that 
									// haven't been matched
									if(self.results[i].numUnmatched > 0 || self.results[i].numMatched < theProject.rowModel.total){
										html += "<p class='notification'>There are some values that have not been matched due to possible differences in punctuation or spellings. Would you like to try to match these values yourself?</p>";
										html += "<p class='notification'><a class='yes button'>Yes</a><a class='ignore button'>Ignore</a></p>";

									}
									
									html += "</div><!-- end result-body -->";
									html += "</div><!-- end result -->";
									
								//} else {
									/*
									html += "<div class='description result'>";
									html += "<a class='col-name' data-serviceurl='"+self.results[i].service.serviceURL+"'>"+self.results[i].columnName+"</a>";
									html += "<div class='result-body'>";
									html += "<p>There were no results for this column.</p>";
									html += "</div><!-- end result-body -->";
									html += "</div><!-- end result -->";
									*/
								//}

								$("div.linking-results").append(html);

							}

						} else {
							log("displayReconciliationResult - shouldn't ever get here...");
							var html = "<div class='description'>";
							html += "<p>No results!</p>";
							html += "</div>";	
							$("div.linking-results").append(html);
						}

						/*
						 * Interaction for the "yes" button when a result contains 
						 * unmatched values
						 */
						$("div.result div.result-body p a.yes").click(function(){

							var resultDiv = $(this).parent("p").parent("div").parent('div');
							resultDiv.find("p.notification").hide();
							resultDiv.find("p.suggestinput").css("visibility","visible");

							// Build a list of inputs containing unmatched values for the user to manually 
							// search for each of their reconcilable values. Finally display the list as the 
							// callback.
							self.makeListOfUnmatchedValues(resultDiv,function(){
								// Show the list
								$("div.linking-results div.result ul.selected-columns").show();
								$("div.linking-results div.result").show();
							});

						});

						/*
						 * Inteaction for the "ignore" button when a result contains 
						 * unmatched values.
						 */
						$("div.result div.result-body p a.ignore").click(function(){
							var resultDiv = $(this).parent("p").parent("div").parent('div');
							resultDiv.find("p.notification").hide();
						});
						
						// Hide the "linking" loading message
						$("div#refine-tabs-facets").children().show();

						//LG.showWizardProgress(false);

						// Once the lists of unmatched values are built and on show,
						// we can hide the loading panel and show the results panel.
						$("div.linking-loading").hide();
						$("div.linking-results").show();
						// Simulate a click on the first result's header
						$("div.linking-results div.result a.col-name").eq(0).click();
						// Make sure the Typing panel is showing
						$("div#left-panel div.refine-tabs").tabs('select', 1);
						// Show the save button
						self.els.saveButton.show();

					});

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
		 * updateMatches
		 * 
		 * Updates the progress bar and the stats about the recon matches for each 
		 * column.
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
			var colName = $(resultDiv).find("a.col-name").html();
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

			// Compute the facet and use the values in the returned data 
			// to feed into our results panel
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
									$(resultDiv).find("p.matches").find("span.matched").html(matched);
									$(resultDiv).find("p.matches").find("span.percentage").html(percentage);
									$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").css("width",percentage+"%");
									$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").removeClass("green").removeClass("yellow").removeClass("red");
									// Colour the progress bar accordingly
									if(percentage > 66){
										$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").addClass("green");
									}else if(percentage > 33){
										$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").addClass("yellow");
									}else {
										$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").addClass("red");
									}
								}
							}
						}
					}
				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

		},

		/*
		 * makeListOfUnmatchedValues
		 * 
		 * Builds a <ul> list of values and inputs for the user to manually search for their 
		 * correct representations against the service endpoint.
		 * 
		 * The result panel <div> element is passed to the function, so we know where to inject
		 * the list once it's built.
		 * 
		 * TODO: This needs pagination / a cut-off point.
		 * TODO: Store the result <div> inside the result's object as a bound variable
		 */
		makeListOfUnmatchedValues: function(resultDiv, callback){

			//log("makeListOfUnmatchedValues");

			var self = this;
			// The expression used to produce a facet of values that haven't been
			// reconciled.
			var expression = "if(cell.recon.matched,blank,value)";
			// The column name
			var colName = $(resultDiv).find("a.col-name").html();
			// The endpoint's URL
			var serviceURL = $(resultDiv).find("a.col-name").attr("data-serviceurl");

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
								arrayOfUnmatchedValues.splice(0,0,choices[j].v.l);
								highest = choices[j].c;
							} else {
								// Add the value to the end of the array.
								arrayOfUnmatchedValues.push(choices[j].v.l);
							}
						}

						
						// Build and inject the HTML list
						html = "<ul class='selected-columns text-input'>";

						for(var i=0; i<arrayOfUnmatchedValues.length; i++){
							html += "<li>" +
							"<span class='col'>"+arrayOfUnmatchedValues[i]+"</span>" +
							"<span class='colOptions'><input type='text' class='suggestbox textbox' data-colname='"+colName+"' data-serviceurl='"+serviceURL+"'/></span>" +
							"</li>";
						}

						html += "</ul>";

						// Insert the HTML into the correct result panel <div>
						$(resultDiv).find("div.result-body").append(html);

						// Create the suggest and preview panes for searching and previewing
						// entities against the endpoints.
						self.suggestPane = $("<div>").attr("id","suggest-pane");
						self.previewPane = $("<div>").attr("id","preview-pane");
						$("body").append(self.suggestPane);
						$("body").append(self.previewPane);

						/*
						 * Iterate through the list of unmatched values and initialise each of their <input> elements  
						 * using the autosuggestion feature
						 */
						$(resultDiv).find("div.result-body").find("ul.selected-columns").children("li").each(function(){
							// We pass the input element, the unmatched value and the endpoints URL
							self.setUpSearchBox($(this).find("input.suggestbox"), $(this).find("span.col").html(), serviceURL);
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
				if(ReconciliationManager.standardServices[i].url == serviceURL){
					suggestOptions = ReconciliationManager.standardServices[i].suggest.entity;
				}
			}
			
			// Create an AJAX object for the suggest pane. We can specifically choose 
			// to abort this AJAX call this way
			self.suggestXHR = {
					abort:function(){}
			};
			
			// Bind "focus" and "keyup" listeners to the input element - allow us 
			// to provide autosuggestions.
			inputElement
			.attr("value", unmatchedValue)
			.bind("focus", function(){
				// Reposition the suggest pane when a user clicks on 
				// an input element
				self.suggestPane.css("left",inputElement.offset().left+"px");
				self.suggestPane.css("top",(inputElement.offset().top+25)+"px");
			})
			.bind("keyup",function(){

				// Change the look of the input to edit-mode
				$(this).removeClass("matched").removeClass("dontknow").addClass("edited");

				// If there's text in the input box
				if(inputElement.val().length > 0){

					// Show the suggest pane with "Searching..." with an indicator 
					self.suggestPane.html('<div class="searching">Searching...</div><div class="options"><span class="text">Only select a match if you are 100% sure it is correct.</span><a class="button">I&apos;m not sure</a></div>');
					self.suggestPane.find("div.searching").show();
					self.suggestPane.find("div.options").hide();
					self.suggestPane.show();

					// Add an on "click" listener to the page body, so 
					// that when the user clicks anyway on the page *apart from* 
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
					if(typeof self.suggestCache[inputElement.val()] == 'undefined'){

						// Given there's no cache entry, call the suggest entity service 
						// using the service's local "flyout" paths (e.g. /suggest/entity/my-service-1/)
						self.suggestXHR = $.ajax({
							type : "GET",
							url : suggestOptions.service_url+suggestOptions.service_path+"?callback=?",
							data : {
								all_types:false,
								prefix: inputElement.val(),
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
									self.suggestPane.html("<div class='options'><p>No results...</p></div>").show();
								}

								// Store the returned data in the cache using the query term as a 
								// key.
								self.suggestCache[inputElement.val()] = data;
								// Keep the cache size down.
								LG.ops.trimObject(self.suggestCache, 100);

							},
							error : function() {
								log("Error fetching suggest entity");
								self.suggestPane.find("div.searching").hide();
								self.suggestPane.html("<div class='options'><p>No results...</p></div>").show();
							}
						});
					} else {
						// If we have a cached result, pass the cached result to the list-building function 
						// instead of the AJAX returned data.
						var data = self.suggestCache[inputElement.val()];
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
		 * Constructs and injects a list of suggestions for the input elements
		 * when matching unmatched values
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
					}
					li.html('<div class="fbs-item-name"><label>'+name+'</label></div>');
					
					// Attach the suggestion data to the list element
					li.data("suggest",data.result[i]);

					// Add an on "click" listener to the suggestion
					li.unbind("click").bind("click",function(){
						// When the suggestion is selected, hide the suggestion pane,
						// abort and hide the preview pane - and continue to match all cells 
						// with the originally unmatched value to the new suggested value.
						self.suggestPane.hide();
						self.previewXHR.abort();
						self.previewPane.hide();
						// Pass the suggestion <li> element, the input element and the original value
						self.matchCellsFromSearch(li, inputElement, unmatchedValue, function(li, inputElement){
							// Once the cells have been matched, style and update the value inside the input element
							inputElement.val(li.data("suggest").name).removeClass("edited").removeClass("dontknow").addClass("matched");
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
					
					// Inject the list element.
					ul.append(li);

				} else {
					/*
					 * Suggested URI does not match what we're looking for
					 */
				}
			}

			// Hide the "searching" message once we've built our list of suggestions
			self.suggestPane.find("div.searching").hide();

			// If we have no suggestions
			if(ul.find("li").length < 1){
				// Display a "no results" message
				self.suggestPane.html("<div class='options'><p>No results...</p></div>").show();
			} else {
				// Show the "options" <div> - this contains buttons for the suggestion pane
				self.suggestPane.find("div.options").show();
				
				// Interaction for the "I'm not sure" button.
				// The user might not be able to find any values to match to the unmatched value, 
				// so we need to offer them an option to say they can't find the value - or they 
				// are not 100% sure
				self.suggestPane.find("div.options a").click(function(){
					// Replace the input element with it's unmatched value
					inputElement.val(inputElement.parent().parent().find("span.col").html());
					// Apply a greyed-out CSS style
					inputElement.addClass("dontknow");
					// We need to remove any reconciliation data for the unmatched value
					self.discardReconValues(inputElement.attr("data-colname"), inputElement.val());
					// Hide the suggest and preview panes
					self.suggestPane.hide();
					self.previewPane.hide();
				});
				
				// Finally append the list of suggestions to the suggest pane
				self.suggestPane.append(ul);
			}
			
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
			// TODO: Duplication of code for cached/uncached
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
			
			var html = "<p class='name'>"+suggest.name+"</p>";
			var desc = $("<div />").html(data.html);

			// Depending on the description returned, we can 
			// handle little or no information by displaying something appropriate
			if(typeof suggest.description != 'undefined'){
				html += "<p class='desc'>"+suggest.description+"</p>";
			} else if(desc.find("div.resource_preview_description").length > 0){
				html += "<p class='desc'>"+desc.find("div.resource_preview_description").html()+"</p>";
			} else {
				html += "<p class='desc'>No information available.</p>";
			}

			// Inject the HTML and show the pane
			self.previewPane.html(html);
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
						columnName: inputElement.attr("data-colname")
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
		discardReconValues:function(columnName, value){

			//log('discardReconValues');

			var self = this;

			var params = {
					columnName: columnName,
					judgment: "none",
					identifierSpace: "http://www.ietf.org/rfc/rfc3986",
					schemaSpace: "http://www.ietf.org/rfc/rfc3986",
					similarValue:value
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
						rootNode.links.splice(j,1);
					}
				}
				
				// Push the resulting RDF into the RDF schema 
				rootNode.links.push(self.results[i].rdf);
			
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
		 * 
		 * Each reconcilation service config object contains information about the resources 
		 * predicate usage - if this isn't present in the config file, then we use a temporary 
		 * vocabulary "lgRecon" (http://data.linkedgov.org/vocabs/recon/) that was declared in the 
		 * initialise() function before calling saveRDF().
		 */
		buildColumnReconciliationRDF:function(result){

			//log("buildColumnReconciliationRDF");
			
			var self = this;
			
			// Add the results vocabulary to the schema
			var resourceInfo = result.service.resourceInfo;

			var resourceURI = resourceInfo.resourceURI;
			var resourceCURIE = resourceInfo.resourceCURIE;
			var predicateURI = resourceInfo.predicateURI;
			var predicateCURIE = resourceInfo.predicateCURIE;
			var vocabURI = resourceInfo.vocabURI;
			var vocabCURIE = resourceInfo.vocabCURIE;

			// Check to see if there is any predicate information, 
			// if there isn't, use the lgRecon vocabulary as a temporary
			// relationship to the reconciled URI (e.g. lgRecon:Department
			// instead of an official gov:hasDepartment).
			if(predicateURI.length < 1){
				predicateURI = self.vocabs.lgRecon.uri+resourceCURIE;
				predicateCURIE = self.vocabs.lgRecon.curie+":"+resourceCURIE;
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
						                    	 "uri":"http://www.w3.org/2000/01/rdf-schema#label",
						                    	 "curie":"rdfs:label",
						                    	 "target":{
						                    		 "nodeType":"cell-as-literal",
						                    		 "expression":"value",
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