/*
 * LinkingPanel
 * 
 * Appears when the user presses the "Next" button on the Typing panel.
 * 
 * Forces the user to check and label the columns as well as give each of them a 
 * short description - which is optional.
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

			/*
			 * Add our services to the ReconcilitionManager
			 */
			/*
			 * If the RDF Extension isn't installed then prevent the user 
			 * from using the LinkedGov extension?
			 */

			LG.addReconciliationServices(0, 1, function(){
				log("Added recon services");
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
				$("div.suggest-links ul").html("");
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
				if(self.confirmedLinks.length > 0){
					/*
					 * Show the reconcile panel
					 */
					LG.showWizardProgress(true);
					self.showReconcilePanel();
				} else {
					alert("You need columns to link! Either click the 'Suggest links' button or select the columns manually ");
				}

			});


			/*
			 * Interaction for the "Save" button
			 */
			this.els.saveButton.click(function(){
				/*
				 * Remove all of the facets containing "judgment" and "candidate" in the title
				 */

			});

		},

		displayPanel: function(){

			/*
			 * Hide the other panels
			 */
			LG.panels.typingPanel.hidePanels();

			// Hide the action buttons
			this.els.actionButtons.hide();
			// Show the collapse-expand button
			this.els.collapseExpandButton.hide();
			// Hide the "return to wizards" button
			this.els.returnButton.hide();
			// Show the finish button
			this.els.finishButton.hide();
			/*
			 * Show this panel
			 */
			this.body.show();
			//this.showSuggestPanel();

		},

		/*
		 * suggestLinks
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
					for(var k=0;k<services[j].keywords.length;k++){
						if(cols[i].name.toLowerCase().indexOf(services[j].keywords[k]) >= 0){
							/*
							 * Column name contains something we're looking for
							 */
							self.suggestedLinks.push({
								columnName:cols[i].name,
								serviceName:services[j].name,
								endpoint:services[j].endpoint,
								serviceURL:"http://127.0.0.1:3333/extension/rdf-extension/services/"+services[j].id,
								possibleTypes:services[j].possibleTypes
							});

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
					html+="<li data-index='"+i+"'><span class='col'>"+self.suggestedLinks[i].columnName+"</span><span class='remove'>X</span><span class='confirm'>C</span><span class='link'>"+self.suggestedLinks[i].serviceName+"</span></li>";
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
				//log($(this).parent().attr("data-index"));
				//log(self.suggestedLinks);
				//log(self.suggestedLinks[parseInt($(this).parent().attr("data-index"))]);
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

		showSuggestPanel:function(){
			var self = this;
			// Hide the save button
			this.els.saveButton.hide();
			// Show the link button
			this.els.linkButton.show();
			// Show the suggest panel
			this.els.linkingPanel.find("div.suggest-panel").show();
			// Hide the reconcile panel
			this.els.linkingPanel.find("div.reconcile-panel").hide();
		},

		showReconcilePanel:function(){
			var self = this;
			// Show the save button
			this.els.saveButton.show();
			// Hide the link button
			this.els.linkButton.hide();
			// Hide the suggest panel
			this.els.linkingPanel.find("div.suggest-panel").hide();
			// Show the reconcile panel
			this.els.linkingPanel.find("div.reconcile-panel").show(0, function(){
				// Begin reconciliation on the confirmed columns
				self.reconcileColumns();					
			});
		},


		/*
		 * Runs reconciliation on the confirmed columns
		 */
		reconcileColumns:function(){

			var self = this;
			/*
			 * Display a new panel that shows the results / scores of 
			 * attempting reconciliation on the confirmed columns.
			 */
			var links = self.confirmedLinks;
			self.results = [];
			/*
			 * Iterate through the confirmed columns and produce the results for reconciliation 
			 * in a new panel to the user.
			 */
			self.queryService(links,0);

		},

		/*
		 * Calls the service URL to guess the value types
		 * 
		 * Note: service URL is this -
		 * http://127.0.0.1:3333/extension/rdf-extension/services/***SERVICE_ID**
		 * 
		 * Not the actual endpoint URL
		 */
		queryService: function(links, index){

			log("queryService");

			var self = this;

			log(links[index].columnName);
			log(links[index].serviceURL);

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "guess-types-of-column",
				data : {
					columnName : links[index].columnName,
					service: links[index].serviceURL
				},
				success : function(data) {

					/*
					 * We're looking for a single match for the column,
					 * if the reconciliation service returns a type with the same id 
					 * as we have in our reconService.possibleTypes list, we store that 
					 * guessed type as the result and move on.
					 */
					if(data.types.length > 0){

						var columnResult;
						columnResult = undefined;

						log("Results returned from recon");

						/*
						 * We are returned a sorted list of "types" that could possibly
						 * be the correct value type
						 */

						for(var i=0;i<data.types.length;i++){

							//for(var j=0; j<links[index].possibleTypes.length; j++){

							//log(data.types[i].id+"=="+links[index].possibleTypes[j]);
							if($.inArray(data.types[i].id, links[index].possibleTypes) >= 0){

								log("Recon has found a match - storing result");

								/*
								 * Recon has found a possible match
								 * 
								 * TODO: This is the time to introduce our own cut-off points 
								 * and logic as to whether to proceed with reconciliation or not.
								 */
								columnResult = {
										columnName:links[index].columnName,
										serviceURL:links[index].serviceURL,
										thing:links[index].serviceName,
										uri:data.types[0].id,
										types:links[index].possibleTypes,
										score:data.types[i].score,
										count:data.types[i].count,
										matched:true
								};

								/*
								 * Break out of the loop
								 */
								i = data.types.length-1;

							} else if(i == data.types.length-1){

								// Have iterated through all of the returned types
								if(typeof columnResults == 'undefined'){

									// We have no results for this column
									log("Finished iterating through types - no matches, but have some guesses");
									/*
									 * Recon has not been able to find a successful match,
									 * but has still managed to guess some types
									 * 
									 * We store a "No results" result - but offering the user 
									 * the choice to manually match the values.
									 */
									columnResult = {
											columnName:links[index].columnName,
											serviceURL:links[index].serviceURL,
											thing:links[index].serviceName,
											uri:data.types[0].id,
											types:links[index].possibleTypes,
											score:data.types[0].score,
											count:data.types[0].count,
											matched:true
									};

								} else {
									log("Finished iterating through types - result present");
								}
							} else {
								log("Have not finished iterating through types");
							}
						} // end for

						self.results.push(columnResult);

						if(index < links.length-1){
							index = index+1;
							log("Querying another service...");
							self.queryService(links, index);
						} else {
							log("Have finished guessing value types");
							// alert("Have finished guessing value types");
							// Nothing
						}

					} else {

						log("No results returned from recon");

						/*
						 * Store a "No results" result for the column
						 */
						self.results.push({
							columnName:links[index].columnName,
							serviceURL:links[index].serviceURL,
							thing:links[index].serviceName,
							uri:"None",
							types:links[index].possibleTypes,
							score:0,
							count:0,
							matched:false
						});
					}

					/*
					 * Start reconciling once we have all results for the 
					 * columns the user confirmed
					 */
					if(self.results.length == self.confirmedLinks.length){
						self.startReconcile();
					}
				},
				error : function() {
					//self.onFail("There was a problem linking data using the service: \""+links[index].serviceURL+"\"");
					//return {};
				}
			});	

		},

		/*
		 * startReconciliation
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
								service: self.results[i].serviceURL,
								identifierSpace: "http://www.ietf.org/rfc/rfc3986",
								schemaSpace: "http://www.ietf.org/rfc/rfc3986",
								type: { id: self.results[i].uri, name: self.results[i].uri },
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
				 * Reconciling produces two facets per column once it's complete.
				 * 
				 * Our test for checking whether reconciliation has finished across all 
				 * columns is once all the facets have been created.
				 */
				if(ui.browsingEngine._facets.length > (self.confirmedLinks.length*2)-1){

					log("here");
					log(ui.browsingEngine._facets.length);
					log(self.confirmedLinks.length*2);

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

								if(self.results[i].uri != "None" && self.results[i].matched){
									html += "<div class='description result'>";
									html += "<a class='col-name' data-serviceurl='"+self.results[i].serviceURL+"'>"+self.results[i].columnName+"</a>";
									html += "<div class='result-body'>";
									html += "<p class='value-type'><span>Type</span><a href='"+self.results[i].uri+"' target='_blank'>"+self.results[i].thing+"</a></p>";
									html += "<p class='matches'><span>Matches</span><span class='matched'>"+(theProject.rowModel.total-self.results[i].numUnmatched)+"</span> / <span class='total'>"+theProject.rowModel.total+"</span> (<span class='percentage'>"+Math.round((((theProject.rowModel.total-self.results[i].numUnmatched)/theProject.rowModel.total)*100))+"</span>%)</p>";
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
									html += "<a class='col-name' data-serviceurl='"+self.results[i].serviceURL+"'>"+self.results[i].columnName+"</a>";
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

									log("data.facets[i].choices[j]");
									log(data.facets[i].choices[j]);
									log(data.facets[i].choices[j].c);

									matched = data.facets[i].choices[j].c;

									var percentage = Math.round(((matched/total)*100));

									$(resultDiv).find("p.matches").find("span.matched").html(matched);
									$(resultDiv).find("p.matches").find("span.percentage").html(percentage);

									log('$(resultDiv).find("div.matches-bar")');
									log($(resultDiv).find("div.matches-bar"));
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

							log("data.facets[i].choices[j].c = "+choices[j].c);

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

					if(k == self.results.length-1) {
						callback();
					}

				}); // end ops


			} // end for 
			/*
			var facetDataInterval = setInterval(function(){

				//log("ui.browsingEngine._facets.length = "+ui.browsingEngine._facets.length);

				if(ui.browsingEngine._facets.length > ((self.results.length*2)-1)){
					for(var i=0; i<ui.browsingEngine._facets.length; i++){

						var facet = ui.browsingEngine._facets[i].facet;
						for(var k=0; k<self.results.length; k++){

							if(facet._config.name.indexOf(self.results[k].columnName) >= 0 
									&& facet._config.name.indexOf("judgment") >= 0
									&& facet._data != null){
								//log("facet data accessible for column "+self.results[k].columnName);
								for(var j=0; j<facet._data.choices.length; j++){
									if(facet._data.choices[j].v.v == "none"){
										self.results[k].numUnmatched = facet._data.choices[j].c;
									} else if(facet._data.choices[j].v.v == "matched"){
										self.results[k].numMatched = facet._data.choices[j].c;								
									}
								} // end for
							} // end if
						} // end for	

					} // end for

					callback();

					clearInterval(facetDataInterval);
				}


			},100);
			 */
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

			var suggestOptions2 = $.extend({ align: "left" }, suggestOptions || { all_types: true });

			inputElement
			.attr("value", localVal)
			.suggest(suggestOptions2)
			.unbind("fb-select")
			.bind("fb-select", function(e, data) {
				//console.log(e);
				//console.log(data);
				//console.log("------------------------");
				match = data;
				self.matchCellsFromSearch(match, inputElement.attr("data-colname"), localVal);
				$(this).removeClass("edited").addClass("matched");
				/*
				 * Column has been matched - ask user to confirm the match was correct
				 */

				/*
				 * Update matched percentage stat on panel
				 */
				var resultDiv = inputElement.parent("span").parent("li").parent("ul").parent("div").parent("div");

				self.updateMatches(resultDiv);

			})
			.bind("keyup",function(){
				$(this).removeClass("matched").addClass("edited");
			});

			return false;
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
		saveRDF:function(){

			var self = this;

			var schema = LG.rdfOps.getSchema();

			var vocabs = {
					gov : {
						curie : "gov",
						uri : "http://http://reference.data.gov.uk/def/central-government/"
					}
			};



		}

}