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
								serviceURL:"http://127.0.0.1:3333/extension/rdf-extension/services/"+services[j].id
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
					 * We are returned a sorted list of "types" that could possibly
					 * be the correct value type
					 */
					for(var i=0;i<data.types.length;i++){
						//if(data.types[i].count == theProject.rowModel.total){
							/*
							 * Recon has apparently matched all the values
							 * 
							 * TODO: This is the time to introduce our own cut-off points 
							 * and logic as to whether to proceed with reconciliation or not.
							 */
							var result = {
									columnName:links[index].columnName,
									serviceURL:links[index].serviceURL,
									uri:data.types[i].id,
									score:data.types[i].score,
									count:data.types[i].count
							};

							i=data.types.length-1;

							self.startReconcile(result);
						//}
					}

					if(index < links.length-1){
						index = index+1;
						self.queryService(links, index);
					} else {
						//alert("Have finished guessing value types");
						// Nothing
						self.displayReconciliationResult();
					}
				},
				error : function() {
					self.onFail("There was a problem querying the service: \""+links[index].serviceURL+"\"");
					return {};
				}
			});	

		},

		/*
		 * startReconciliation
		 */
		startReconcile:function(result){

			Refine.postCoreProcess(
					"reconcile",
					{},
					{
						columnName: result.columnName,
						config: JSON.stringify({
							mode: "standard-service",
							service: result.serviceURL,
							identifierSpace: "http://www.ietf.org/rfc/rfc3986",
							schemaSpace: "http://www.ietf.org/rfc/rfc3986",
							type: { id: result.uri, name: result.uri },
							autoMatch: true,
							columnDetails: []
						})
					},
					{ cellsChanged: true, columnStatsChanged: true },
					{
					}
			);

		},

		/*
		 * Displays the results in the panel
		 */
		displayReconciliationResult: function(){

			var self = this;
			$("div#refine-tabs-facets").children().hide();
			
			/*
			 * Hide the facets
			 */
			var interval = setInterval(function(){
								
				if(ui.browsingEngine._facets.length > 1){
					log("Recon finished?");
					for(var i=0; i<ui.browsingEngine._facets.length; i++){
						if(ui.browsingEngine._facets[i].facet._config.name.indexOf("judgment") >= 0 || ui.browsingEngine._facets[i].facet._config.name.indexOf("best candidate") >= 0){
							ui.browsingEngine.removeFacet(ui.browsingEngine._facets[i].facet);
							i=i-1;
						}
					}
					

					/*
					 * Hide the "linking" loading message
					 */
					$("div#refine-tabs-facets").children().show()

					LG.showWizardProgress(false);

					$("div.linking-loading").hide();
					$("div.linking-results").show();
					$("a##refine-tabs-typing").click();
					/*
					 * Display the results 
					 */
					//for(var i=0; i<self.results.length; i++){

					//}
					
					clearInterval(interval);
				} else {
				}
				
			},10);


		}

}