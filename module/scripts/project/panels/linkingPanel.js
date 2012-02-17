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
		 * Inject the labellingPanel HTML
		 */
		loadHTML: function(){
			/*
			 * Load the wizard questions
			 */
			ui.typingPanel._el.linkingPanel.html(DOM.loadHTML("linkedgov", "html/project/panels/linkingPanel.html"));

		},

		/*
		 * initialisePanel
		 * 
		 */
		initialise : function() {

			var self = this;

			self.els = ui.typingPanel._el;
			self.body = self.els.linkingPanel;
			self.suggestCache = {
					"a":"b"
			};
			self.previewCache = {
					"a":"b"					
			};
			self.flyoutPane = "";
			self.entityPane = "";

			/*
			 * Load the reconciliation service configurations.
			 * 
			 * Example service config:
			 * 
				serviceName:"UK Ward & Borough names",
				serviceType:"sparql",
				hints:["ward","borough"],
				endpoint:"http://api.talis.com/stores/ordnance-survey/services/sparql",
				labelProperty:"http://www.w3.org/2000/01/rdf-schema#label",
				resourceInfo:{
					resourceURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/LondonBoroughWard",
					resourceCURIE:"LondonBoroughWard"
					predicateURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/ward",
					predicateCURIE:"ward",
					vocabURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/",
					vocabCURIE:"admingeo"
				}

			 */

			/*
			 * Unregister any reconciliation services
			 * TODO: Might not want to do this
			 */
			ReconciliationManager.standardServices.length = 0;
			ReconciliationManager.customServices.length = 0;
			ReconciliationManager.save(function(){
				$.getScript("extension/linkedgov/scripts/project/reconciliationServices.js", function(data){
					LG.vars.reconServices = eval('(' + data + ')');
				});
			});


			/*
			 * Interaction for the "Suggest links" button
			 */
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

			/*
			 * Interaction for the "Clear all" button
			 */
			$("div.suggest-links a.clearButton").live("click",function(){
				$("div.suggest-links a.clearButton").hide();
				$("div.possible-links h3.confirmed").hide();
				$("div.suggest-links.confirmed").hide();
				$("div.suggest-links ul").html("");
				$("div.suggest-links a.suggestButton").css("display","inline-block");
				$("div.suggest-links ul.selected-columns").hide();
				self.suggestedLinks = [];
				self.confirmedLinks = [];
			});

			/*
			 * Interaction for the remove button in the column list
			 */
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

			/*
			 * Interaction for result headers
			 */
			$("div.result a.col-name").live("click",function(){
				$("div.result div.result-body").slideUp();
				if($(this).parent("div").find("div.result-body").css("display") == "none"){
					$(this).parent("div").find("div.result-body").slideDown();
				}

				/*
				 * Update the matches-bar
				 */
				self.updateMatches($(this).parent());
			});

			/*
			 * Interaction for the "Link" button
			 */
			this.els.linkButton.click(function(){
				if(typeof self.confirmedLinks != 'undefined' && self.confirmedLinks.length > 0){
					/*
					 * Show the reconcile panel
					 */
					//LG.showWizardProgress(true);
					self.buildProgressBars(function(){
						self.showResultPanel();
					});

				} else {
					alert("You need to confirm which columns you want to link. Click the 'Suggest links' button to see which columns might be linkable.");
				}

			});


			/*
			 * Interaction for the "Save" button
			 */
			this.els.saveButton.click(function(){

				/*
				 * Remove all of the facets containing "judgment" and "candidate" in the title
				 */
				LG.rdfOps.checkSchema({}, function(rootNode, foundRootNode) {
					self.saveRDF(rootNode, foundRootNode);
				});
			});

		},

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

		showResultPanel:function(){

			var self = this;

			// Hide the link button
			this.els.linkButton.hide();

			// Hide the suggest panel
			this.els.linkingPanel.find("div.suggest-panel").hide();

			// Show & set up the cancel button
			this.els.cancelButton
			.unbind("click")
			.bind("click",function(){
				/*
				 * Alert the user they will lose their reconciliation results if they 
				 * press "back".
				 */
				var ans = window.confirm("Are you sure? You will lose any un-saved reconciliation data.");
				if(ans){
					self.cancelReconciliation(function(){
						LG.restoreHistory(self.historyRestoreID);	
						var interval = setInterval(function(){
							if(ui.browsingEngine._facets.length < (self.confirmedLinks.length*2)){

							} else {
								$("div.linking-loading div.progressDiv").each(function(){
									$(this).remove();
								});
								$("div#refine-tabs-facets").children().show();
								$("div#left-panel div.refine-tabs").tabs('select', 1);
								self.showSuggestPanel();
								LG.showWizardProgress(false);
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
		 */
		buildProgressBars:function(callback){

			log("buildProgressBars");

			var self = this;

			var html = "";
			for(var i=0;i<self.confirmedLinks.length;i++){

				html+= "<div class='progressDiv'>";
				html+= "<p class='columnName'>"+self.confirmedLinks[i].columnName+"</p>";
				html+= "<p class='service'>"+self.confirmedLinks[i].service.serviceName+"</p>";
				html+= "<div class='recon-bar ui-progressbar'><div class='ui-progressbar-value'></div></div>";
				html+= "</div>";

			}

			$("div.linking-loading").html($("div.linking-loading").html()+html);

			callback();

		},


		/*
		 * pollReconciliationJobs
		 * 
		 */
		pollReconciliationJobs:function(){

			var self = this;

			//log("---------------------------")
			$.get(
					"/command/core/get-processes?" + $.param({ project: theProject.id }), null,
					function(data) {
						//log(data);
						for(var i=0;i<data.processes.length;i++){
							//log(data.processes[i].description);
							if(data.processes[i].description.indexOf("Reconcile") >= 0){
								//log(data.processes[i].description);
								var columnName = data.processes[i].description.split("Reconcile cells in column ")[1].split(" to type")[0];
								//log(columnName);
								self.updateProgressBar(columnName, data.processes[i].progress);
							}
						}

					}
			);

		},

		/*
		 * updateProgressBar
		 */
		updateProgressBar:function(columnName, percentage){

			$(".linking-loading").find("div.progressDiv").each(function(){
				if($(this).find("p.columnName").html() == columnName){
					$(this).find("div.ui-progressbar-value").css("width",percentage+"%");
				}
			});

		},

		/*
		 * cancelReconciliation
		 * 
		 * Cancels the reconciliation processes
		 */
		cancelReconciliation:function(callback){

			log("cancelReconciliation");

			var self = this;

			$.post(
					"/command/core/cancel-processes?" + $.param({ project: theProject.id }), 
					null,
					function(o) {
						self.results = [];
						self.confirmedLinks = [];
						self.suggestedLinks = [];
						$("div.linking-results").html('<h3>Results</h3>');
						$("div.suggest-links a.clearButton").click();
						$("div.suggest-links ul.selected-columns").hide();
						callback();
					},
					"json"
			);

		},

		/*
		 * Clears the reconciliation data for any results left in the 
		 * self.results array.
		 */
		clearRecentReconciliationData: function(callback){

			var self = this;

			for(var i=0;i<self.results.length;i++){

			}

		},

		/*
		 * suggestLinks
		 * 
		 * Builds a list of "link" objects that contain the:
		 * - column name
		 * - service name
		 * - endpoint url
		 * - linked type
		 * 
		 * Automatically suggests columns to link to the user
		 */
		suggestLinks: function(){

			var self = this;

			/*
			 * Suggest links
			 * 
			 * Suggest column if a column name contains any keywords we've specified 
			 * in the LG.vars.reconServices variable.
			 * ...
			 */
			self.suggestedLinks = [];
			self.confirmedLinks = [];

			var services = LG.vars.reconServices;

			var cols = theProject.columnModel.columns;
			for(var i=0; i<cols.length; i++){
				for(var j=0;j<services.length;j++){
					for(var k=0;k<services[j].hints.length;k++){
						if(cols[i].name.toLowerCase().indexOf(services[j].hints[k]) >= 0){

							/*
							 * Column name contains something we're looking for
							 */
							self.suggestedLinks.push({
								columnName:cols[i].name,
								service:services[j]
							});

							/*
							 * Break out of the loop so we only suggest one link per service 
							 * per guess.
							 */
							j=services.length-1;
						}						
					}
				}
			}

			/*
			 * Display results inside the div.suggestedLinks element
			 */
			if(self.suggestedLinks.length > 0){
				var html="";
				for(var i=0;i<self.suggestedLinks.length;i++){
					html+="<li data-index='"+i+"'><span class='col'>"+self.suggestedLinks[i].columnName+"</span><span class='remove'>X</span><span class='confirm'>C</span><span class='link'>"+self.suggestedLinks[i].service.serviceName+"</span></li>";
				}
				$("div.suggest-links ul.selected-columns").html(html).css("display","block");
				$("div.suggest-links ul.selected-columns").css("display","block");
			} else {
				$("div.suggest-links ul.selected-columns").html("<li class='none'>None...</li>").css("display","block");
				$("div.suggest-links ul.selected-columns").css("display","block");				
			}
			/*
			 * Return the "Suggest links" button back to normal / remove it
			 */
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
		 * Uses the array of confirmed links to guess the types in the columns.
		 * 
		 * Runs reconciliation on the confirmed columns.
		 */
		reconcileColumns:function(){

			var self = this;

			/*
			 * Save the restore point so the user can cancel at any point
			 */
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
			 * Add the confirmed link's service to Refine / RDF extension 
			 * (depending on whether it's a SPARQL or standard service)
			 *
			 * Iterate through the confirmed columns and produce the results for reconciliation 
			 * in a new panel to the user.
			 */
			for(var i=0;i<self.confirmedLinks.length;i++){
				LG.addReconciliationService(self.confirmedLinks[i].service.serviceName, 0, function(service){
					log("service");
					log(service);

					for(var j=0;j<self.confirmedLinks.length;j++){
						if(service.serviceName == self.confirmedLinks[j].service.serviceName){
							/*
							 * Create a result - including the column name and it's 
							 * matched service.
							 */
							log("Adding a result");
							var result = {
									columnName:self.confirmedLinks[j].columnName,
									service:service,
									score:0,
									count:0,
									matched:true
							};

							self.confirmedLinks.splice(j,1);

							self.results.push(result);

							j = self.confirmedLinks.length-1;

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
		 */
		startReconcile:function(){

			var self = this;
			//self.results.push(result);

			log("startReconcile");
			//log("index = "+index);
			log("self.results.length = "+self.results.length);


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

				if(i == self.results.length-1){
					self.displayReconciliationResult();
				}
			}

		},

		/*
		 * displayReconciliationResult
		 * 
		 * Displays the results in the panel
		 */
		displayReconciliationResult: function(){

			log("displayReconciliationResult");

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

				//log("ui.browsingEngine._facets.length = "+ui.browsingEngine._facets.length);
				//log("(self.confirmedLinks.length*2)-1 = "+((self.confirmedLinks.length*2)-1));

				/*
				 * Update the progress bars while we wait for the reconciliation to finish
				 */
				self.pollReconciliationJobs();

				/*
				 * Reconciling produces two facets per column once it's complete.
				 * 
				 * Our test for checking whether reconciliation has finished across all 
				 * columns is once all the facets have been created.
				 */			
				if(ui.browsingEngine._facets.length > (self.results.length*2)-1){

					log("here");
					log(ui.browsingEngine._facets.length);
					log(self.results.length*2);

					/*
					 * Checks that the facets have been created once reconciliation 
					 * has finished, so we can access the scores to display on the panel.
					 * 
					 * TODO: We are calling a function to return one pair of scores instead of 
					 * for all of the columns
					 */
					self.checkFacetMatchCounts(function(){

						if(self.results.length > 0){

							for(var i=0; i<self.results.length; i++){

								log("Creating result panel - "+i);

								var html = "";

								if(self.results[i].matched){
									html += "<div class='description result'>";
									html += "<a class='col-name' data-serviceurl='"+self.results[i].service.serviceURL+"'>"+self.results[i].columnName+"</a>";
									html += "<div class='result-body'>";
									html += "<p class='value-type'>" +
									"<span>Type</span>" +
									"<a href='"+self.results[i].service.resourceInfo.resourceURI+"' target='_blank'>"+self.results[i].service.serviceName+"</a>" +
									"</p>";
									html += "<p class='matches'>" +
									"<span>Matches</span>" +
									"<span class='matched'>"+(theProject.rowModel.total-self.results[i].numUnmatched)+"</span> / " +
									"<span class='total'>"+theProject.rowModel.total+"</span> (<span class='percentage'>"+
									Math.round((((theProject.rowModel.total-self.results[i].numUnmatched)/theProject.rowModel.total)*100))+"</span>%)</p>";
									html += '<div class="matches-bar ui-progressbar"><div class="ui-progressbar-value"></div></div>';
									if(self.results[i].numUnmatched > 0 || self.results[i].numMatched < theProject.rowModel.total){
										html += "<p class='notification'>There are some values that have not been matched due to possible differences in punctuation or spellings. Would you like to try to match these values yourself?</p>";
										html += "<p class='notification'><a class='yes button'>Yes</a><a class='ignore button'>Ignore</a></p>";

									}
									html += "</div><!-- end result-body -->";
									html += "</div><!-- end result -->";

									/*
									 * Even for a matched column there will be unmatched values.
									 * We need to provide the search box for the user here.
									 * 
									 * Create a judgment facet - if there are "none" choices available, 
									 * we need to provide a search box.
									 * 
									 * Idealistic case is to have 100% as "matched".
									 */
								} else {
									/*
									 * No match, so offer the user a search box to search 
									 * for the entity
									 */
									html += "<div class='description result'>";
									html += "<a class='col-name' data-serviceurl='"+self.results[i].service.serviceURL+"'>"+self.results[i].columnName+"</a>";
									html += "<div class='result-body'>";									
									//if(self.results[i].numUnmatched > 0|| self.results[i].numMatched < theProject.rowModel.total){
									//	html += "<p>There are some values that have not been matched due to possible differences in punctuation or spellings. Would you like to try to match these values yourself?</p>";
									//	html += "<a class='yes button'>Yes</a><a class='ignore button'>Ignore</a>";
									//}
									html += "<p>There were no results for this column.</p>";
									html += "</div><!-- end result-body -->";
									html += "</div><!-- end result -->";
								}

								$("div.linking-results").html($("div.linking-results").html()+html);

								//var resultDiv = $("div.linking-results").find("div.result").eq($("div.linking-results").find("div.result").length-1);
								//self.updateMatches(resultDiv);
							}


						} else {
							log("displayReconciliationResult - shouldn't ever get here...");
							var html = "<div class='description'>";
							html += "<p>No results!</p>";
							html += "</div>";	
							$("div.linking-results").html($("div.linking-results").html()+html);
						}

						/*
						 * Interaction for the "yes" button when a result contains 
						 * unmatched values
						 */
						$("div.result div.result-body p a.yes").click(function(){

							var resultDiv = $(this).parent("p").parent("div").parent('div');
							resultDiv.find("p.notification").hide();
							resultDiv.find("p.suggestinput").css("visibility","visible");

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


						/*
						 * Hide the "linking" loading message
						 */
						$("div#refine-tabs-facets").children().show();

						LG.showWizardProgress(false);

						$("div.linking-loading").hide();
						$("div.linking-results").show();
						$("div.linking-results div.result a.col-name").eq(0).click();
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
		 * column panel
		 */
		updateMatches:function(resultDiv){

			log("updateMatches");
			log(resultDiv);

			var total = parseInt($(resultDiv).find("p.matches").find("span.total").html());

			var matched = 0;

			var colName = $(resultDiv).find("a.col-name").html();
			var expression = 'forNonBlank(cell.recon.judgment, v, v, if(isNonBlank(value), "(unreconciled)", "(blank)"))';

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

						/*
						 * If the facet matches the column name and has
						 * choices returned
						 */
						if (data.facets[i].columnName == colName  
								&& typeof data.facets[i].choices != 'undefined') {

							for(var j=0; j<data.facets[i].choices.length; j++){

								if(data.facets[i].choices[j].v.v == "matched"){

									//log("data.facets[i].choices[j]");
									//log(data.facets[i].choices[j]);
									//log(data.facets[i].choices[j].c);

									matched = data.facets[i].choices[j].c;

									var percentage = Math.round(((matched/total)*100));

									$(resultDiv).find("p.matches").find("span.matched").html(matched);
									$(resultDiv).find("p.matches").find("span.percentage").html(percentage);

									//log('$(resultDiv).find("div.matches-bar")');
									//log($(resultDiv).find("div.matches-bar"));
									$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").css("width",percentage+"%");
									$(resultDiv).find("div.matches-bar").find("div.ui-progressbar-value").removeClass("green").removeClass("yellow").removeClass("red");

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
		 */
		makeListOfUnmatchedValues: function(resultDiv, callback){

			log("makeListOfUnmatchedValues");

			var self = this;
			var unmatchedValues = "";
			var expression = "if(cell.recon.matched,blank,value)";
			var colName = $(resultDiv).find("a.col-name").html();
			var serviceURL = $(resultDiv).find("a.col-name").attr("data-serviceurl");

			LG.ops.computeColumnFacet(colName, expression, function(data){
				/*
				 * Loop through the UI facets
				 */
				log("data.facets.length = " + data.facets.length);
				for ( var i = 0; i < data.facets.length; i++) {

					/*
					 * If the facet matches the column name and has
					 * choices returned
					 */
					if (data.facets[i].columnName == colName 
							&& data.facets[i].name.indexOf("judgment") < 0 
							&& data.facets[i].name.indexOf("candidate") < 0 
							&& typeof data.facets[i].choices != 'undefined') {
						/*
						 * Loop through the returned facet choices (count) number of times
						 * and append them to the unordered list.
						 */
						var highest = 0;
						var choices = data.facets[i].choices;
						var choicesArray = [];
						for(var j=0; j<choices.length; j++){

							//log("data.facets[i].choices[j].c = "+choices[j].c);

							if(choices[j].c >= highest){
								choicesArray.splice(0,0,choices[j].v.l);
								highest = choices[j].c;
							} else {
								choicesArray.push(choices[j].v.l);
							}
						}

						//log(choicesArray);
						var arrayOfUnmatchedValues = choicesArray;
						//log("arrayOfUnmatchedValues=");
						//log(arrayOfUnmatchedValues);

						/*
						 * Build and inject the HTML list
						 */
						html = "<ul class='selected-columns text-input'>";

						for(var i=0; i<arrayOfUnmatchedValues.length; i++){
							html += "<li>" +
							"<span class='col'>"+arrayOfUnmatchedValues[i]+"</span>" +
							"<span class='colOptions'><input type='text' class='suggestbox textbox' data-colname='"+colName+"' data-serviceurl='"+serviceURL+"'/></span>" +
							"</li>";
						}

						html += "</ul>";

						$(resultDiv).find("div.result-body").append(html);

						self.flyoutPane = $("<div>").attr("id","flyout-pane");
						self.entityPane = $("<div>").attr("id","entity-pane");
						$("body").append(self.flyoutPane);
						$("body").append(self.entityPane);

						/*
						 * Iterate through the list of values and set the inputs up 
						 * with the autosuggest plugin
						 */
						$(resultDiv).find("div.result-body").find("ul.selected-columns").children("li").each(function(){
							self.setUpSearchBox($(this).find("input.suggestbox"), $(this).find("span.col").html(), serviceURL);
						});

						callback();

					}
				}
			});


		},

		/*
		 * checkFacetMatchCounts
		 * 
		 * Stores the number of matched values returned by reconciliation
		 */
		checkFacetMatchCounts: function(callback){

			log("checkFacetMatchCounts");

			var self = this;

			for(var k=0; k<self.results.length; k++){
				LG.ops.computeColumnFacet(self.results[k].columnName, 'forNonBlank(cell.recon.judgment, v, v, if(isNonBlank(value), "(unreconciled)", "(blank)"))', function(data){
					for ( var i = 0; i < data.facets.length; i++) {

						/*
						 * If the facet matches the column name and has
						 * choices returned
						 */
						if (data.facets[i].columnName == self.results[k].columnName 
								&& data.facets[i].name.indexOf("judgment") < 0 
								&& data.facets[i].name.indexOf("candidate") < 0 
								&& typeof data.facets[i].choices != 'undefined') {

							var choices = data.facets[i].choices;
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
		 * Returns an input element that's been setup 
		 * to suggest entities from the given service
		 */
		setUpSearchBox:function(inputElement, localVal, serviceURL){

			var self = this;

			inputElement.parent("span").parent("li").parent("ul").show();
			inputElement.show();

			log("setUpSearchBox");
			log(inputElement);
			log("localVal = "+localVal);
			log(serviceURL);

			/*
			 * Find the service's suggest options using it's URL
			 */
			var suggestOptions;
			for(var i=0; i<ReconciliationManager.standardServices.length;i++){
				if(ReconciliationManager.standardServices[i].url == serviceURL){
					suggestOptions = ReconciliationManager.standardServices[i].suggest.entity;
				}
			}

			var suggestOptions2 = $.extend({ align: "left" }, suggestOptions || { all_types: false });

			log("suggestOptions2");
			log(suggestOptions2);

			/*
			 * OLD SUGGEST PLUGIN CODE
			 * 
			inputElement
			.attr("value", localVal)
			.suggest(suggestOptions2)
			.unbind("fb-select")
			.bind("fb-select", function(e, data) {
				//console.log(e);
				//console.log(data);
				console.log("------------------------");
				match = data;
				self.matchCellsFromSearch(match, inputElement.attr("data-colname"), localVal);
				$(this).removeClass("edited").addClass("matched");

				// Update matched percentage stat on panel

				var resultDiv = inputElement.parent("span").parent("li").parent("ul").parent("div").parent("div");
				log(resultDiv);
				self.updateMatches(resultDiv);

			})
			.bind("keyup",function(){

			});
			 */

			var xhr = {
					abort:function(){}
			};

			/*
			 * TODO: Use event delegation for all of this interaction
			 */
			inputElement
			.attr("value", localVal)
			.bind("keyup",function(){

				// Change the look of the input to edit-mode
				$(this).removeClass("matched").removeClass("dontknow").addClass("edited");

				//log("suggestEntities");
				//log(inputElement);
				//log(suggestOptions);
				//log(xhr);

				if(inputElement.val().length > 0){

					// Show the flyout pane with "Searching..." with an indicator 
					self.flyoutPane.css("left",inputElement.offset().left+"px");
					self.flyoutPane.css("top",(inputElement.offset().top+25)+"px");
					self.flyoutPane.html('<div class="searching">Searching...</div><div class="options"><span class="text">Only select a match if you are 100% sure it is correct.</span><a class="button">I&apos;m not sure</a></div>');
					self.flyoutPane.find("div.searching").show();
					self.flyoutPane.find("div.options").hide();

					self.flyoutPane.show();

					$("#body").bind("click",function(){
						self.flyoutPane.hide();
						self.entityPane.hide();
						$("#body").unbind("click");
					});

					// Cancel the current AJAX request
					xhr.abort();

					// Check cache for request
					if(typeof self.suggestCache[inputElement.val()] == 'undefined'){

						xhr = $.ajax({
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
								if(typeof data.result != 'undefined' && data.result.length > 0){
									var ul = $("<ul>").addClass("fbs-list");
									for(var i=0;i<data.result.length;i++){

										//log("result "+i)

										/*
										 * Filter the suggestions by their 
										 * URI patterns
										 */
										if(self.checkSuggestion(data.result[i].id, serviceURL)){

											//log("Creating result");

											var li = $("<li>").addClass("fbs-item");

											var name = data.result[i].name;

											if(name.indexOf(inputElement.val()) > -1){
												name = data.result[i].name.replace(inputElement.val(),"<strong>"+inputElement.val()+"</strong>");
											} else if(name.indexOf(inputElement.val().toLowerCase()) > -1){
												name = data.result[i].name.replace(inputElement.val().toLowerCase(),"<strong>"+inputElement.val().toLowerCase()+"</strong>");
											}

											li.html('<div class="fbs-item-name"><label>'+name+'</label></div>');
											li.data("suggest",data.result[i]);
											li.unbind("click").bind("click",function(){
												self.flyoutPane.hide();
												self.entityPane.hide();
												self.matchCellsFromSearch($(this).data("suggest"), inputElement.attr("data-colname"), localVal);
												inputElement.val($(this).data("suggest").name).removeClass("edited").removeClass("dontknow").addClass("matched");
												var resultDiv = inputElement.parent("span").parent("li").parent("ul").parent("div").parent("div");
												self.updateMatches(resultDiv);

											}).hover(function(){
												self.showEntityPreview($(this), $(this).data("suggest"), suggestOptions);
											},function(){
												self.entityPane.hide();
											});

											ul.append(li);

										} else {
											/*
											 * Suggested URI does not match what we're looking for
											 */
										}


									}

									self.flyoutPane.find("div.searching").hide();
									
									if(ul.find("li").length < 1){
										self.flyoutPane.find("div.options").html("<p>No results...</p>").show();
									} else {
										self.flyoutPane.find("div.options").show();
										self.flyoutPane.find("div.options a").click(function(){
											inputElement.val(inputElement.parent().parent().find("span.col").html());
											inputElement.addClass("dontknow");
											self.flyoutPane.hide();
											self.entityPane.hide();
										});
										self.flyoutPane.append(ul);
									}

								} else {
									self.flyoutPane.find("div.options").html("<p>No results...</p>").show();
								}
								
								self.suggestCache[inputElement.val()] = data;
								self.trimSuggestCache();
							
							},
							error : function() {
								log("Error fetching suggest entity");
								self.flyoutPane.find("div.searching").hide();
								self.flyoutPane.find("div.options").html("<p>No results...</p>").show();
							}
						});
					} else {
						var data = self.suggestCache[inputElement.val()];

						var ul = $("<ul>").addClass("fbs-list");
						for(var i=0;i<data.result.length;i++){

							if(self.checkSuggestion(data.result[i].id, serviceURL)){
								
								//log("Creating result");
								
								var li = $("<li>").addClass("fbs-item");

								var name = data.result[i].name;

								if(name.indexOf(inputElement.val()) > -1){
									name = data.result[i].name.replace(inputElement.val(),"<strong>"+inputElement.val()+"</strong>");
								} else if(name.indexOf(inputElement.val().toLowerCase()) > -1){
									name = data.result[i].name.replace(inputElement.val().toLowerCase(),"<strong>"+inputElement.val().toLowerCase()+"</strong>");
								}

								li.html('<div class="fbs-item-name"><label>'+name+'</label></div>');
								li.data("suggest",data.result[i]);
								li.unbind("click").bind("click",function(){
									self.flyoutPane.hide();
									self.entityPane.hide();
									self.matchCellsFromSearch($(this).data("suggest"), inputElement.attr("data-colname"), localVal);
									inputElement.val($(this).data("suggest").name).removeClass("edited").removeClass("dontknow").addClass("matched");
									var resultDiv = inputElement.parent("span").parent("li").parent("ul").parent("div").parent("div");
									self.updateMatches(resultDiv);

								}).hover(function(){
									self.showEntityPreview($(this), $(this).data("suggest"), suggestOptions);
								},function(){
									self.entityPane.hide();
								});

								ul.append(li);
							} else {
								/*
								 * Suggested URI does not match what we're looking for
								 */						
							}
						}

						self.flyoutPane.find("div.searching").hide();

						if(ul.find("li").length < 1){
							self.flyoutPane.find("div.options").html("<p>No results...</p>").show();
						} else {
							self.flyoutPane.find("div.options").show();
							self.flyoutPane.find("div.options a").click(function(){
								inputElement.val(inputElement.parent().parent().find("span.col").html());
								inputElement.addClass("dontknow");
								self.flyoutPane.hide();
								self.entityPane.hide();
							});
							self.flyoutPane.append(ul);
						}
					}
				} else {
					self.flyoutPane.hide();
				}
			});

			return false;
		},

		/*
		 * checkSuggestion
		 * 
		 * TODO: Ideally, the cache would infact be the 
		 * validated & constructed HTML instead of the raw response
		 * returned from the endpoint. This would save a lot of 
		 * validating/iterating etc.
		 * 
		 * Checks to see if a suggestion's URI is 
		 * something we're looking for
		 */
		checkSuggestion:function(id, serviceURL){

			//log("checkSuggestion");

			var self = this;

			/*
			 * Find service
			 */
			var services = LG.vars.reconServices;

			for(var j=0;j<services.length; j++){
				if(services[j].serviceURL === serviceURL){
					// We want to chop the slug off the URI
					id = id.substring(0,id.lastIndexOf("/")+1);
					/*
					 * If the resources URI path matches or there is no
					 * path to match against, then include it in the list
					 * by returning true
					 */ 
					//log(id);
					//log(services[j].resourceInfo.uriPath);
					
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
		 * Makes an AJAX request and displays a pane showing information 
		 * about an entity
		 */
		showEntityPreview:function(li, suggest, suggestOptions){

			var self = this;

			self.entityPane.html("<p class='name'>Loading...</p>");
			self.entityPane.css("top",(li.offset().top)+"px");

			// TODO: Check cache for request
			if(typeof self.previewCache[suggest.id] == 'undefined'){
				var xhr = $.ajax({
					type : "GET",
					url : suggestOptions.flyout_service_url+suggestOptions.flyout_service_path+"?callback=?",
					data : {
						id:suggest.id
					},
					dataType:"json",
					async:true,
					success : function(data) {
						if(typeof data.html != 'undefined'){
							var html = "<p class='name'>"+suggest.name+"</p>";
							//html += "<p class='id'>"+suggest.id+"</p>";

							var desc = $("<div />").html(data.html);

							if(typeof suggest.description != 'undefined'){
								html += "<p class='desc'>"+suggest.description+"</p>";
							} else if(desc.find("div.resource_preview_description").length > 0){
								html += "<p class='desc'>"+desc.find("div.resource_preview_description").html()+"</p>";
							} else {
								html += "<p class='desc'>No information available.</p>";
							}
							self.entityPane.html(html);
							self.entityPane.show();
							self.previewCache[suggest.id] = data;
							self.trimPreviewCache();
						}
					},
					error : function() {
						log("Error fetching preview entity");
					}
				});
			} else {
				var data = self.previewCache[suggest.id];
				var html = "<p class='name'>"+suggest.name+"</p>";
				//html += "<p class='id'>"+suggest.id+"</p>";

				var desc = $("<div />").html(data.html);

				if(typeof suggest.description != 'undefined'){
					html += "<p class='desc'>"+suggest.description+"</p>";
				} else if(desc.find("div.resource_preview_description").length > 0){
					html += "<p class='desc'>"+desc.find("div.resource_preview_description").html()+"</p>";
				} else {
					html += "<p class='desc'>No information available.</p>";
				}
				self.entityPane.html(html);
				self.entityPane.show();
				self.previewCache[suggest.id] = data;
				self.trimPreviewCache();
			}

		},

		/*
		 * Keeps the suggest cache at a length of 100
		 */
		trimSuggestCache:function(){
			var i=0;
			$.each(self.suggestCache,function(k,v){
				if(i<100){
					i++;
				} else {
					delete obj[k];
				}
			});
		},

		/*
		 * Keeps the preview cache at a length of 100
		 */
		trimPreviewCache:function(){
			var i=0;
			$.each(self.previewCache,function(k,v){
				if(i<100){
					i++;
				} else {
					delete obj[k];
				}
			});
		},

		/*
		 * matchCellsFromSearch
		 */
		matchCellsFromSearch:function(match, colName, localValue){

			log('matchCellsFromSearch');

			var self = this;
			if (match !== null) {
				var params = {
						judgment: "matched",
						id: match.id,
						name: match.name,
						types:""
				};

				params.similarValue = localValue;
				params.columnName = colName;

				Refine.postCoreProcess(
						"recon-judge-similar-cells", 
						{} || {}, 
						params,
						{ cellsChanged: true, columnStatsChanged: true}
				);
			}

		},


		/*
		 * generateColumnFacet
		 * 
		 * Given a column name and a number (count), this will create and return 
		 * an array of values from the column given the expression passed to it.
		 */
		generateColumnFacet : function(colName, expression, callback){

			//var html = "";

			//log("generateColumnFacet");

			LG.ops.computeColumnFacet(colName, expression, function(data){
				/*
				 * Loop through the UI facets
				 */
				//log("data.facets.length = " + data.facets.length);
				for ( var i = 0; i < data.facets.length; i++) {

					/*
					 * If the facet matches the column name and has
					 * choices returned
					 */
					if (data.facets[i].columnName == colName 
							&& data.facets[i].name.indexOf("judgment") < 0 
							&& data.facets[i].name.indexOf("candidate") < 0 
							&& typeof data.facets[i].choices != 'undefined') {
						/*
						 * Loop through the returned facet choices (count) number of times
						 * and append them to the unordered list.
						 */
						var highest = 0;
						var choices = data.facets[i].choices;
						var choicesArray = [];
						for(var j=0; j<choices.length; j++){

							//log("data.facets[i].choices[j].c = "+choices[j].c);

							if(choices[j].c >= highest){
								choicesArray.splice(0,0,choices[j].v.l);
								highest = choices[j].c;
							} else {
								choicesArray.push(choices[j].v.l);
							}
						}

						log(choicesArray);

						callback(choicesArray);

					}
				}
			});

		},

		/*
		 * saveRDF
		 * 
		 * Saves the newly linked URIs in RDF.
		 * 
		 * Erases any other RDF stored for this particular column
		 */
		saveRDF:function(rootNode, newRootNode){

			var self = this;

			/*
			 * Iterate through the results
			 */
			for(var i=0;i<self.results.length;i++){

				//var result = self.results[i];
				//var columnName = self.results[i].columnName;
				//var service = self.results[i].service;

				self.results[i].rdf = self.buildColumnReconciliationRDF(self.results[i]);

				log("Saved result's rdf...");
				log(self.results[i]);

				rootNode.links.push(self.results[i].rdf);

			}


			var schema = LG.rdfOps.getRDFSchema();
			if (!newRootNode) {
				log("rootNode has already been updated...");
			} else {
				log("Adding first rootNode for address data...");
				schema.rootNodes.push(rootNode);
			}

			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema : JSON.stringify(schema)
			}, {}, {
				onDone : function() {
					// DialogSystem.dismissUntil(self._level - 1);
					// theProject.overlayModels.rdfSchema = schema;
					self.onComplete();
				}
			});
		},

		/*
		 * buildColumnReconciliationRDF
		 */
		buildColumnReconciliationRDF:function(result){


			/*
			 * Add the results vocabulary to the schema
			 */

			var resourceInfo = result.service.resourceInfo;

			var resourceURI = resourceInfo.resourceURI;
			var resourceCURIE = resourceInfo.resourceCURIE;
			var predicateURI = resourceInfo.predicateURI;
			var predicateCURIE = resourceInfo.predicateCURIE;
			var vocabCURIE = resourceInfo.vocabCURIE;


			if(predicateURI.length < 1){
				predicateURI = LG.vars.lgNameSpace+"/recon/"+resourceCURIE;
				predicateCURIE = resourceCURIE;
				vocabCURIE = "lgRecon";
			}

			var rdf = {
					"uri" : predicateURI,
					"curie" : vocabCURIE+":"+predicateCURIE,
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression":"if(isError(cell.recon.match.id),value,cell.recon.match.id)",
						"columnName":result.columnName,
						"isRowNumberCell" : false,
						"rdfTypes":[
						            {
						            	"uri":resourceURI,
						            	"curie":vocabCURIE+":"+resourceCURIE
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
		},

		onComplete:function(){
			LG.panels.typingPanel.showStartMessage();
		}

}




