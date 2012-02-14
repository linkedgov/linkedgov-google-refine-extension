/*
 * LabellingPanel
 * 
 * Appears when the user presses the "Next" button on the Typing panel.
 * 
 * Forces the user to check and label the columns as well as give each of them a 
 * short description - which is optional.
 */
var LinkedGov_LabellingPanel = {

		/*
		 * Inject the labellingPanel HTML
		 */
		loadHTML: function(){
			/*
			 * Load the wizard questions
			 */
			ui.typingPanel._el.labellingPanel.html(DOM.loadHTML("linkedgov", "html/project/panels/labellingPanel.html"));

		},

		/*
		 * initialisePanel
		 */
		initialise : function() {

			var self = this;
			self.els = ui.typingPanel._el;
			
			self.illegalChars = [ "*", "@", "%", ":", "=", "&", "<", ">", "/", "\\", "."];
			self.body = ui.typingPanel._el.labellingPanel;

			var labelData = LG.vars.labelsAndDescriptions; 
			var colData = labelData.cols;

			/*
			 * Add an on "focus" listener to the row label and description inputs
			 */
			$("div.row-description input, " +
			"div.row-description textarea").live("focus",function(){
				$("table.data-table > tbody > tr.odd > td ").css("background-color",$("div.row-description input").css("background-color"));
				if($(this).hasClass("row-label") && $(this).val() == "Each row is a..."){
					$(this).val("");
				} else if($(this).hasClass("row-description") && $(this).val() == "Enter a description..."){
					$(this).val("");
				}
			});

			/*
			 * Add an on "key up" listener to the row label and description inputs
			 */
			$("div.row-description input, " +
			"div.row-description textarea").live("keyup",function(){
				self.checkRowDescription($(this).parent());
				$("table.data-table > tbody > tr.odd > td ").css("background-color",$("div.row-description input").css("background-color"));
			});

			/*
			 * Add an on "blur" listener to the row label and description inputs
			 */
			$("div.row-description input, " +
			"div.row-description textarea").live("blur",function(){

				/*
				 * Highlight the rows in the table to indicate to the user they 
				 * are labeling rows.
				 */
				$("table.data-table > tbody > tr.odd > td ").css("background-color","#F2F2F2");

				if($(this).hasClass("row-label") && $(this).val() == ""){
					$(this).val("Each row is a...");
				} else if($(this).hasClass("row-description") && $(this).val() == ""){
					$(this).val("Enter a description...");
				} else {
					/*
					 * Trim whitespace from row name and check it
					 */
					$(this).val($(this).val().trim());

					self.checkRowDescription($(this).parent());
				}


			});

			/*
			 * Add an on "focus" listener to the column label and description inputs
			 */
			$("div.column-list ul li input.column-label, " +
			"div.column-list ul li textarea.column-description").live("focus",function(){

				var liElement = $(this).parent();
				var colName = $(this).parent("li").find("input.column-label").val();

				/*
				 * Highlight the column in the data table when the user focuses on their 
				 * label or description input using the input's current status
				 */
				$("div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == colName){
						$(this).parent("div").parent("td").addClass(liElement.attr("class"));
					}
				});

				/*
				 * Remove the holding text upon focus.
				 */
				if($(this).val() == "Enter a description..."){
					$(this).val("");
				}
			});

			/*
			 * Interaction when pressing a key in the column label or description input fields
			 */
			$("div.column-list ul li input.column-label, " +
			"div.column-list ul li textarea.column-description").live("keyup",function(){
				self.checkColumnDescription($(this).parent());
			});

			/*
			 * Add an on "blur" listener to the column label and description inputs
			 */
			$("div.column-list ul li input.column-label, " +
			"div.column-list ul li textarea.column-description").live("blur",function(){

				var el = $(this);
				var colName = $(this).parent("li").find("input.column-label").val();

				/*
				 * Remove the highlight from the column in the data table.
				 */
				$("div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == colName){
						$(this).parent("div").parent("td").removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great");
					}
				});
				/*
				 * Replace the holding text if the description wasn't filled out properly.
				 */
				if($(this).hasClass("column-description") && $(this).val() == ""){
					$(this).val("Enter a description...");
				}

				/*
				 * Trim the whitespace and validate the column
				 */
				$(this).val($(this).val().trim());
				self.checkColumnDescription($(this).parent());

				/*
				 * Rename column if the status is 'good'/'great' & has been changed & if the name
				 * does not exist for a column already.
				 */
				if($(this).hasClass("column-label") && LG.ops.isUniqueColumnName(el.val())){
					if($(this).parent("li").hasClass("maybe") || $(this).parent("li").hasClass("good") || $(this).parent("li").hasClass("great")){
						/*
						 * The old labels of the columns are stored using the elements "data" property as  
						 * a temporary holding spot. This gets overriden whenever the label is changed for the 
						 * better.
						 */
						var oldName = $(this).data("original-name");
						var newName = el.val();
						var status = ($(this).parent("li").hasClass("maybe") ? "maybe" : ($(this).parent("li").hasClass("good") ? "good" : "great" )); 
						log("LabellingPanel, status: "+status);

						for(var i=0;i<colData.length;i++){
							if(colData[i].label == oldName){
								colData[i].label = newName;
								colData[i].description = el.parent().find("textarea").val();
								colData[i].status = status;
							}
						}

						LG.ops.renameColumn(oldName,newName,function(){

							/*
							 * Rename the column name in the RDF schema too
							 */
							LG.rdfOps.renameColumnInRDF.start(oldName,newName,function(){
								Refine.update({modelsChanged:true});
							});

							/*
							 * Store the new column label as the original label.
							 */
							el.data("original-name",el.val());

						});

					} else {
						/*
						 * Restore the input field value using it's original label.
						 */
						el.val(el.data("original-name"));
					}
				} else if($(this).data("original-name") == el.val()){
					// Do nothing
					//el.val(el.data("original-name"));
				} else if($(this).hasClass("column-description")){
					// Do nothing
				} else {
					//alert("A column already exists with this name.");
					el.val(el.data("original-name"));
				}

			});

			/*
			 * Setup interaction for the Finish button
			 */
			this.els.finishButton.click(function(){

				/*
				 * TODO: Make checks to see if the user has visited each panel,
				 * as they might head for the Finish button after just using the wizards/
				 */
				/*
				 * Save the description data as RDF
				 * 
				 * Save any columns without RDF with generic RDF using 
				 * their column names as properties.
				 * 
				 * Perform some basic validation so that the user must make sure all labels 
				 * are correctly entered to a certain level of acceptability.
				 */
				var error = false;
				if($("div.row-description").hasClass("maybe") || $("div.row-description").hasClass("bad")){
					error = true;
				}
				$("div.column-list ul li").each(function(){
					if($(this).hasClass("maybe") || $(this).hasClass("bad")){
						error = true;
					}
				});
				if(error){
					alert("Some labels still need to be checked, please make sure you have checked the row description and all of the columns.")
				} else {

					$("td.column-header").each(function(){
						$(this).removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great");
					});

					LG.rdfOps.saveLabelsToRDF.init();
				}
				
			});

		},

		/*
		 * Make this panel visible
		 */
		displayPanel: function(){

			// Hide the other panels
			LG.panels.typingPanel.hidePanels();
			/*
			 * Rebuild the label inputs in case any new columns 
			 * have been created.
			 */
			this.buildColumnDescriptionInputs();
			// Show the action bar
			this.els.actionBar.show();
			// Show the "save" button
			this.els.finishButton.show();
			// Show this panel
			this.body.show();	
			// Scroll the panel to the top
			$("div#labelling-panel").scrollTop(0);

		},

		/*
		 * Builds a UL list of input and textarea elements for each column
		 * for the user to enter labels & descriptions
		 */
		buildColumnDescriptionInputs : function(){

			var self = this;
			/*
			 * Create the input fields for the column labels and descriptions - adding 
			 * a CSS class to them to highlight their acceptability status.
			 */
			$("div.column-list").hide();
			var html = "<ul>";
			$("div.column-header-title span.column-header-name").each(function(){

				var colName = LG.decodeHTMLEntity($(this).html());
				/*
				 * Only create a label and description input for a column if it's not the "All" column and 
				 * not in the hidden columns list (because these columns aren't stored in the data
				 */
				if(colName != "All" && $.inArray(colName,LG.vars.hiddenColumns.split(",")) < 0){
					/*
					 * Column name status can be:
					 * great - label and description entered
					 * good - user has entered a name
					 * bad - is blank or contains the word "column"
					 * maybe - could be fine
					 */
					var status = "maybe";
					if(colName.length < 2 || colName.toLowerCase().indexOf("column") > -1){
						status = "bad";
					}
					html += "<li class='"+status+"'>" +
					"<input class='column-label' value='"+colName+"' />" +
					"<textarea class='column-description' value='Enter a description...'>Enter a description...</textarea>" + 
					"</li>";
					$(this).parent().parent().addClass(status);
				}
			});
			html += "</ul>";

			$("div.column-list").html(html);


			/*
			 *  Attempts to load the labels and descriptions of the rows and columns from the temporary 
			 *  global 'labelsAndDescription' object.
			 *  
			 *  The global labels object is used to temporarily store the labels and descriptions in the 
			 *  labels and descriptions panel so the user can switch between the panels without losing any 
			 *  information they have entered.
			 *  
			 *  The labels and descriptions are properly stored in RDF once the user clicks "Save".
			 */
			var labelData = LG.vars.labelsAndDescriptions; 
			var colData = labelData.cols;

			/*
			 * If the global labels object exists, populate the input fields using 
			 * it's values.
			 */
			if(colData.length > 0){

				log("Loading descriptions from local object...");

				if(labelData.rowLabel){
					$("div.row-description input.row-name").val(labelData.rowLabel);
				}
				if(labelData.rowDescription){
					$("div.row-description textarea.row-description").val(labelData.rowDescription);
				}

				//DescriptionsPanel.checkRowDescription($("div.row-description"));

				for(var i=0;i<colData.length;i++){
					$("div.column-list ul li").each(function(){

						if($(this).find("input.column-label").val() == colData[i].label){
							//log("Replacing description for "+colData[i].label+": "+colData[i].description);
							$(this).find("textarea.column-description").val(colData[i].description).html(colData[i].description);
							//DescriptionsPanel.checkColumnDescription($(this));
						}

						$(this).find("input.column-label").data("original-name",$(this).find("input.column-label").val());
					});
				}

				$("div.column-list").show();
			} else {
				/*
				 * If the globals labels object doesn't exist, try to load the labels from the RDF schema.
				 */
				self.loadLabelsAndDescriptionFromRDF(function(){
					$("div.column-list").show(function(){

						/*
						 * Store the row label and description
						 */
						labelData.rowLabel = $("div.row-description input.row-name").val();
						labelData.rowDescription = $("div.row-description textarea.row-description").val();

						/*
						 * Validate the row label and description
						 */
						self.checkRowDescription($("div.row-description"));

						/*
						 * Populate a global labels object of column names and description so the user can 
						 * switch between panels before saving and not lose their input values.
						 */
						$("div.column-list ul li").each(function(){
							colData.push({
								label:$(this).find("input.column-label").val(),
								description:$(this).find("textarea.column-description").val(),
								status:"maybe"
							});
							$(this).find("input.column-label").data("original-name",$(this).find("input.column-label").val());
							//DescriptionsPanel.checkColumnDescription($(this));
						});


					});
				});
			}
		},


		/*
		 * loadLabelsAndDescriptionFromRDF
		 * 
		 * Loop through the root nodes in the RDF schema, locating the 
		 * row and column label and descriptions, using them to populate 
		 * the input fields in the labels and descriptions panel.
		 * 
		 */
		loadLabelsAndDescriptionFromRDF : function(callback) {

			var self = this;
			/*
			 * Make sure the RDF schema exists
			 */
			if (typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined') {

				var schema = theProject.overlayModels.rdfSchema;

				/*
				 * Loop throught the RDF root nodes and test the RDF type.
				 */
				for(var i=0; i<schema.rootNodes.length; i++){
					if(typeof schema.rootNodes[i].rdfTypes != 'undefined' && schema.rootNodes[i].rdfTypes.length > 0) {

						/*
						 * If the RDF type is owl:Class then we've found the row label & description
						 */
						if(schema.rootNodes[i].rdfTypes[0].curie == "owl:Class"){

							for(var j=0; j<schema.rootNodes[i].links.length; j++){
								/*
								 * Locate the label and comment and populate the input fields
								 */
								if(schema.rootNodes[i].links[j].curie == "rdfs:label"){
									$("div.row-description input.row-label").val(schema.rootNodes[i].links[j].target.value)
									$("div.row-description input.row-label").parent().removeClass("maybe");
									$("div.row-description input.row-label").parent().addClass("good");
								} else if(schema.rootNodes[i].links[j].curie == "rdfs:comment"){
									$("div.row-description textarea.row-description").val(schema.rootNodes[i].links[j].target.value)
									$("div.row-description textarea.row-description").parent().addClass("great");
								}
							}

						} else if(schema.rootNodes[i].rdfTypes[0].curie == "owl:ObjectProperty") {
							/*
							 * If the type is owl:ObjectProperty, we've found a column label & description
							 */
							if(schema.rootNodes[i].links.length == 2 && schema.rootNodes[i].links[0].curie.indexOf("rdfs") >= 0){
								for(var j=0; j<schema.rootNodes[i].links.length; j++){
									if(schema.rootNodes[i].links[j].curie == "rdfs:label"){		
										/*
										 * Loop through the panel inputs and locate the input with the matching 
										 * column label
										 */
										$("div.column-list ul li").each(function(){
											if($(this).find("input.column-label").val() == schema.rootNodes[i].links[j].target.value){

												$(this).removeClass("maybe").addClass("good");

												/*
												 * For the "link" object found to contain the label, use the other link object (the comment) 
												 * to populate the column's description input.
												 */
												$(this).find("textarea.column-description")
												.val(schema.rootNodes[i].links[(j?0:1)].target.value)
												.html(schema.rootNodes[i].links[(j?0:1)].target.value);

												if($(this).find("textarea.column-description").val().length > 2){

													/*
													 * We use decodeHTMLEntity here because we are grabbing the name from the  
													 * table header which is a HTML element
													 */
													$("td.column-header span.column-header-name").each(function(){
														if(LG.decodeHTMLEntity($(this).html()) == $(this).find("input.column-label").val()){
															$(this).removeClass("bad").removeClass("maybe").removeClass("good").addClass("great");
														}
													});

												} else {
													/*
													 * We use decodeHTMLEntity here because we are grabbing the name from the  
													 * table header which is a HTML element
													 */
													$("td.column-header span.column-header-name").each(function(){
														if(LG.decodeHTMLEntity($(this).html()) == $(this).find("input.column-label").val()){
															$(this).removeClass("bad").removeClass("maybe").removeClass("great").addClass("good");
														}
													});

												}

											}
										});
									}
								}
							}
						}
					}
				}

				callback();

			} else {
				callback();
				return false;
			}
		},


		/*
		 * checkRowDescription
		 * 
		 * Validates the input for the row label and description on interaction.
		 */
		checkRowDescription : function(divElement){

			var self = this;

			var input = divElement.find("input.row-label");
			var textarea = divElement.find("textarea.row-description");
			var labelData = LG.vars.labelsAndDescriptions;

			/*
			 * Add the status's CSS class
			 */
			if(input.val().trim().length > 2 && input.val() != "Each row is a..."){

				divElement.removeClass("bad").removeClass("maybe").addClass("good");
				if(textarea.val().length > 2 && textarea.val() != "Enter a description..."){
					divElement.addClass("great");
					labelData.rowStatus = "great";
				} else {
					divElement.removeClass("great").addClass("good");
					labelData.rowStatus = "good";
				}
			} else {
				divElement.removeClass("great").removeClass("good").addClass("bad");
				labelData.rowStatus = "bad";
			}

			/*
			 * Store the values in the global labels object.
			 */
			labelData.rowLabel = input.val();
			labelData.rowDescription = textarea.val();


		},

		/*
		 * checkColumnDescription
		 * 
		 * Validates and styles the inputs for the column labels and descriptions.
		 */
		checkColumnDescription : function(liElement){

			var self = this;
			var input = liElement.find("input.column-label");
			var textarea = liElement.find("textarea.column-description");
			var colData = LG.vars.labelsAndDescriptions.cols;
			var status = "";

			/*
			 * If the column label is longer than 2 letters and doesn't contain the word column
			 */
			if(input.val().trim().length > 2 && input.val().toLowerCase().indexOf("column") < 0){
				liElement.removeClass("bad").removeClass("maybe").addClass("good");
				status = "good";
				/*
				 * If the description value is not equal to the holding text, add the "great" 
				 * status.
				 */
				if(textarea.val().length > 2 && textarea.val() != "Enter a description..."){
					liElement.removeClass("bad").removeClass("maybe").removeClass("good").addClass("great");
					status = "great";
				} else {
					liElement.removeClass("bad").removeClass("maybe").removeClass("great").addClass("good");
					status = "good";			
				}
			} else {
				liElement.removeClass("maybe").removeClass("good").removeClass("great").addClass("bad");
				status = "bad";
			}

			/*
			 * Store the column description in the local object.
			 */
			for(var i=0;i<colData.length;i++){
				if(colData[i].label == input.val()){
					colData[i].description = textarea.val();
					colData[i].status = status;
				}
			}

			/*
			 * We use decodeHTMLEntity here because we are grabbing the name from the  
			 * table header which is a HTML element
			 */
			$("td.column-header span.column-header-name").each(function(){
				if(LG.decodeHTMLEntity($(this).html()) == input.val()){
					var el = $(this).parent().parent();
					el.removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great").addClass(status);
				}
			});
		}

}
