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

			this.els = ui.typingPanel._el;
			this.body = this.els.linkingPanel;

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
			this.showSuggestPanel();

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

					if(data.types.length > 0){
						/*
						 * We are returned a sorted list of "types" that could possibly
						 * be the correct value type
						 */
						for(var i=0;i<data.types.length;i++){
							for(var j=0; j<links[index].possibleTypes.length; j++){
								//log(data.types[i].id+"=="+links[index].possibleTypes[j]);
								if(data.types[i].id == links[index].possibleTypes[j]){
									/*
									 * Recon has found a possible match
									 * 
									 * TODO: This is the time to introduce our own cut-off points 
									 * and logic as to whether to proceed with reconciliation or not.
									 */
									self.results.push({
										columnName:links[index].columnName,
										serviceURL:links[index].serviceURL,
										uri:data.types[i].id,
										score:data.types[i].score,
										count:data.types[i].count,
										matched:true
									});

									i = data.types.length-1;

								} else {

								}
							}

							if(i == data.types.length - 1){
								if(self.results.length < 1){
									/*
									 * Recon has not been able to find a successful match
									 */
									self.results.push({
										columnName:links[index].columnName,
										serviceURL:links[index].serviceURL,
										uri:data.types[i].id,
										score:data.types[i].score,
										count:data.types[i].count,
										matched:false
									});
								} else {
									self.startReconcile(0);
								}
							} else {

							}
						}

						if(index < links.length-1){
							index = index+1;
							self.queryService(links, index);
						} else {
							//alert("Have finished guessing value types");
							// Nothing
						}

					} else {

						self.results.push({
							columnName:links[index].columnName,
							serviceURL:links[index].serviceURL,
							uri:"None",
							score:0,
							count:0
						});

						self.startReconcile(0);
					}
				},
				error : function() {
					self.onFail("There was a problem linking data using the service: \""+links[index].serviceURL+"\"");
					return {};
				}
			});	

		},

		/*
		 * startReconciliation
		 */
		startReconcile:function(index){

			var self = this;

			if(index < self.results.length){
				//if(self.results[index].uri != "None"){
				Refine.postCoreProcess(
						"reconcile",
						{},
						{
							columnName: self.results[index].columnName,
							config: JSON.stringify({
								mode: "standard-service",
								service: self.results[index].serviceURL,
								identifierSpace: "http://www.ietf.org/rfc/rfc3986",
								schemaSpace: "http://www.ietf.org/rfc/rfc3986",
								type: { id: self.results[index].uri, name: self.results[index].uri },
								autoMatch: true,
								columnDetails: []
							})
						},
						{ cellsChanged: true, columnStatsChanged: true },
						{
						}
				);

				//} else {
				// Do not reconcile
				//}

				index++;
				self.startReconcile(index);
			} else {
				self.displayReconciliationResult();
			}

		},

		/*
		 * Displays the results in the panel
		 */
		displayReconciliationResult: function(){

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

				if(ui.browsingEngine._facets.length > 1){
					log("Recon finished");

					self.checkFacetCounts(function(numUnmatched, numMatched){



						/*
						 * Display the results 
						 * 
						 * 	 columnName:links[index].columnName,
						 serviceURL:links[index].serviceURL,
						 uri:"None",
						 score:0,
						 count:0	

						 */
						if(self.results.length > 0){
							var html = "";
							for(var i=0; i<self.results.length; i++){

								if(self.results[i].uri != "None" && self.results[i].matched){
									html += "<div class='description result "+i+"'>";
									html += "<p class='colName'>"+self.results[i].columnName+"</p>";
									html += "<p>"+self.results[i].serviceURL+"</p>";
									html += "<p>"+self.results[i].uri+"</p>";
									html += "<p>"+self.results[i].score+"</p>";
									html += "<p>"+self.results[i].count+"</p>";
									log(numUnmatched+" - "+numMatched);
									if(numUnmatched > 0 || numMatched < theProject.rowModel.total){
										html += "<p>There are some values that have not been matched due to possible differences in punctuation or spellings. Would you like to try to match these values yourself?</p>";
										html += "<a class='yes button'>Yes</a><a class='ignore button'>Ignore</a>";
										html += "<p class='suggestinput'><input type='text' class='suggestbox result-"+i+"' data-serviceurl='"+self.results[i].serviceURL+"' data-colname='"+self.results[i].columnName+"' /></p>";
									}
									html += "</div>";


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
									html += "<div class='description result "+i+"'>";
									html += "<p class='colName'>"+self.results[i].columnName+"</p>";
									log(numUnmatched+" - "+numUnmatched);
									if(numUnmatched > 0 || numMatched < theProject.rowModel.total){
										html += "<p>There are some values that have not been matched due to possible differences in punctuation or spellings. Would you like to try to match these values yourself?</p>";
										html += "<a class='yes button'>Yes</a><a class='ignore button'>Ignore</a>";
										html += "<p class='suggestinput'><input type='text' class='suggestbox result-"+i+"' data-serviceurl='"+self.results[i].serviceURL+"' data-colname='"+self.results[i].columnName+"' /></p>";
									}
									html += "</div>";
								}
							}

							$("div.linking-results").html($("div.linking-results").html()+html);
						} else {
							log("displayReconciliationResult - shouldn't ever get here...");
							html += "<div class='description'>";
							html += "<p>No results!</p>";
							html += "</div>";	
							$("div.linking-results").html($("div.linking-results").html()+html);
						}

						$("div.linking-results div.result a.button.yes").click(function(){
							$(this).hide();
							$(this).parent().find("a.ignore").hide();
							$(this).parent().find("p.suggestinput").css("visibility","visible");
							self.setUpSearchBox($(this).parent().find("input.suggestbox"), theProject.rowModel.rows[0].cells[theProject.columnModel.columns[Refine.columnNameToColumnIndex($(this).parent().find("p.colName").html())].cellIndex].v);
						});

						/*
						 * Set up any search boxes for unreconciled values
						 */
						//$("div.linking-results").find("input.suggestbox").each(function(){
						//	self.setUpSearchBox($(this).parent().find("input.suggestbox"), theProject.rowModel.rows[0].cells[theProject.columnModel.columns[Refine.columnNameToColumnIndex($(this).parent().find("p.colName").html())].cellIndex].v);
						//});

						/*
						 * Hide the "linking" loading message
						 */
						$("div#refine-tabs-facets").children().show();

						LG.showWizardProgress(false);

						$("div.linking-loading").hide();
						$("div.linking-results").show();
						$("div#left-panel div.refine-tabs").tabs('select', 1);

					});

					clearInterval(interval);

				} else {

				}

			},10);


		},

		checkFacetCounts: function(callback){

			var self = this;

			// Number of "matched" values
			var numMatched = 0;
			// Number of "unmatched" values
			var numUnmatched = 0;


			var facetDataInterval = setInterval(function(){

				for(var i=0; i<ui.browsingEngine._facets.length; i++){


					//log("ui.browsingEngine._facets");
					//log(ui.browsingEngine._facets);
					//log("ui.browsingEngine._facets[i].facet");
					//log(ui.browsingEngine._facets[i].facet);
					//log("ui.browsingEngine._facets[i].facet._data");
					//log(ui.browsingEngine._facets[i].facet._data);

					if(ui.browsingEngine._facets[i].facet._config.name.indexOf("judgment") >= 0 && ui.browsingEngine._facets[i].facet._data != null){
						/*
						 * Do something using judgment facet
						 */
						//ui.browsingEngine.removeFacet(ui.browsingEngine._facets[i].facet);
						//i=i-1;

						log("facet data accessible");
						for(var j=0; j<ui.browsingEngine._facets[i].facet._data.choices.length; j++){
							//log("ui.browsingEngine._facets[i].facet._data.choices[j].v.v");
							//log(ui.browsingEngine._facets[i].facet._data.choices[j].v.v);
							//log("ui.browsingEngine._facets[i].facet._data.choices[j].c");
							//log(ui.browsingEngine._facets[i].facet._data.choices[j].c);
							if(ui.browsingEngine._facets[i].facet._data.choices[j].v.v == "none"){
								if(ui.browsingEngine._facets[i].facet._data.choices[j].c == theProject.rowModel.total){
									/*
									 * 100% UN-matched
									 */
									log("No values matched at all");
									numUnmatched = ui.browsingEngine._facets[i].facet._data.choices[j].c;
									log(numUnmatched);
								} else {
									/*
									 * 0-99% un-matched
									 */
									log("Some values matched / un-matched");
									numUnmatched = ui.browsingEngine._facets[i].facet._data.choices[j].c;
									log(numUnmatched);
								}
							} else if(ui.browsingEngine._facets[i].facet._data.choices[j].v.v == "matched"){
								if(ui.browsingEngine._facets[i].facet._data.choices[j].c == theProject.rowModel.total){
									/*
									 * 100% MATCHED
									 */
									log("All values matched!");
									numMatched = ui.browsingEngine._facets[i].facet._data.choices[j].c;
									log(numMatched);
								} else {
									/*
									 * 0-99% matched
									 */
									log("Some values matched / un-matched");
									numMatched = ui.browsingEngine._facets[i].facet._data.choices[j].c;
									log(numMatched);
								}									
							}
						}

						callback(numUnmatched, numMatched);

						clearInterval(facetDataInterval);

					} else if(ui.browsingEngine._facets[i].facet._config.name.indexOf("best candidate") >= 0){
						/*
						 * Do something using best candidate facet
						 */
					}



				} // end for
			},10);
		},


		/*
		 * setUpSearchBox
		 * 
		 * Returns an input element that's been setup 
		 * to suggest entities from the given service
		 */
		setUpSearchBox:function(inputElement, localVal){

			var self = this;

			log("setUpSearchBox");
			log(inputElement.attr("data-serviceurl"));

			/*
			 * Find the service's suggest options using it's URL
			 */
			var suggestOptions;
			for(var i=0; i<ReconciliationManager.standardServices.length;i++){
				if(ReconciliationManager.standardServices[i].url == inputElement.attr("data-serviceurl")){
					suggestOptions = ReconciliationManager.standardServices[i].suggest.entity;
				}
			}

			var suggestOptions2 = $.extend({ align: "left" }, suggestOptions || { all_types: true });

			inputElement
			.attr("value", localVal)
			.suggest(suggestOptions2)
			.bind("fb-select", function(e, data) {
				match = data;
				self.matchCellsFromSearch(match, inputElement.attr("data-colname"), localVal);
				/*
				 * Column has been matched - ask user to confirm the match was correct
				 */
			})
			.data("suggest").textchange();

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
						{ cellsChanged: true, columnStatsChanged: true }
				);
			}

		}

}