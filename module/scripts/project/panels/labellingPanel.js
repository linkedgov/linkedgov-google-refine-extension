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
		 * loadHTML
		 * 
		 * Inject the labellingPanel HTML
		 */
		loadHTML: function(){
			/*
			 * Load the HTML into the bound "labellingPanel" element.
			 */
			ui.typingPanel._el.labellingPanel.html(DOM.loadHTML("linkedgov", "html/project/panels/labellingPanel.html"));
		},

		/*
		 * initialisePanel
		 * 
		 * Set up interaction and store variables for the panel
		 */
		initialise : function() {

			var self = this;

			// Store the illegal characters for column names
			// Note: Unused for now as percentage encoding is being used.
			self.illegalChars = [ "*", "@", "%", ":", "=", "&", "<", ">", "/", "\\", "."];

			// Store the bound elements in the Typing panel for ease of reference
			self.els = ui.typingPanel._el;
			// Store this panels body element for ease of reference
			self.body = ui.typingPanel._el.labellingPanel;

			/*
			 * Add focus, keyup and blur listeners to the row description
			 */
			$("input.row-label, textarea.row-description")
			.live("focus",function(){
				// Highlight the rows in the table using the same colour as the input background
				$("table.data-table > tbody > tr.odd > td ").css("background-color",$("div.row-description input").css("background-color"));
				// If the user has clicked on the input element
				if($(this).is("input")){
					// Hide all other textareas
					$('div.column-list ul li textarea').slideUp();
					// Slide the textarea down if the user clicks on the input
					$(this).next("textarea").data("olddisplay","block").slideDown();
					// Remove the holding text if it hasn't been edited yet
					if($(this).val() == "Each row is a..."){
						$(this).val("");
					}
				} else if($(this).is("textarea") && $(this).val() == "Enter a description..."){
					// Remove the holding text for the textarea if it hasn't been edited yet
					$(this).val("");
				}
			})
			.live("keyup",function(){
				// After every key stroke, validate the input and the textarea as one input
				self.checkRowDescription($(this).parent());
				// Update the row highlighting in the table depending on the description status
				$("table.data-table > tbody > tr.odd > td ").css("background-color",$("div.row-description input").css("background-color"));
			})
			.live("blur",function(){
				// Remove the row highlighting
				$("table.data-table > tbody > tr.odd > td").css("background-color","#F2F2F2");
				if($(this).is("input") && $(this).val() == ""){
					// Restore the holding text for the input if left blank
					$(this).val("Each row is a...");
				} else if($(this).is("textarea") && $(this).val() == ""){
					// Restore the holding text for the textarea if left blank
					$(this).val("Enter a description...");
				} else {
					// Trim whitespace from row name and check it
					$(this).val($(this).val().trim());
					self.checkRowDescription($(this).parent());
				}
			});

			/*
			 * Add focus, keyup and blur listeners to the column descriptions
			 */
			$("input.column-label, textarea.column-description")
			.live("focus",function(){

				// If focusing on the input
				if($(this).is("input")){
					// Hide all textareas
					$('textarea.row-description').slideUp();
					$('textarea.column-description').slideUp();
					// Show this column's textarea
					$(this).next("textarea").data("olddisplay","block").slideDown();
				} else if($(this).is("textarea")){
					// Remove the holding text upon focusing on the textarea
					if($(this).val() == "Enter a description..."){
						$(this).val("");
					}
				}

				/*
				 * Highlight the column in the data table when the user focuses on their 
				 * label or description input using the input's current status
				 */
				// Store the parent element to access it inside the each function
				var liElement = $(this).parent();
				// Store the input's value to access it inside the each function
				var colName = liElement.find("input.column-label").val();
				$("div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == colName){
						// Add the inputs class to the column header in the table - this will 
						// colour it accordingly.
						$(this).parent("div").parent("td").addClass(liElement.attr("class"));
					}
				});
			})
			.live("keyup",function(){
				// On every stroke, check the column label and description at once
				self.checkColumnDescription($(this).parent());
			})
			.live("blur",function(){

				// Store the column name
				var colName = $(this).parent("li").find("input.column-label").val();

				// Remove the highlight from the column in the data table.
				$("div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == colName){
						$(this).parent("div").parent("td").removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great");
					}
				});

				// Replace the holding text if the description wasn't filled out properly.
				if($(this).is("textarea") && $(this).val() == ""){
					$(this).val("Enter a description...");
				}

				// Trim the whitespace and validate the column label and description
				$(this).val($(this).val().trim());
				self.checkColumnDescription($(this).parent());

				/*
				 * If the value entered for the column results in the status 'good'/'great' & 
				 * is a new value & the name does not exist for a column already - then rename the column!
				 */
				// Store the element for use inside functions
				var el = $(this);
				if($(this).is("input") && LG.ops.isUniqueColumnName($(this).val())){
					if($(this).parent("li").hasClass("maybe") || $(this).parent("li").hasClass("good") || $(this).parent("li").hasClass("great")){
						/*
						 * The old labels of the columns are stored using the elements "data" property as  
						 * a temporary storage space. This gets overridden whenever the label is changed for the 
						 * better.
						 */
						var oldName = $(this).data("original-name");
						var newName = $(this).val();

						// The element may have many classes, so we use some logic to find out which status we're after
						var status = ($(this).parent("li").hasClass("maybe") ? "maybe" : ($(this).parent("li").hasClass("good") ? "good" : "great" )); 
						// Store the entered values and the columns status in a local object 
						var colData = LG.vars.labelsAndDescriptions.cols;
						for(var i=0;i<colData.length;i++){
							if(colData[i].label == oldName){
								colData[i].label = newName;
								colData[i].description = el.parent().find("textarea").val();
								colData[i].status = status;
							}
						}

						// Pass the old and new names to our generic function to rename the column
						LG.ops.renameColumn(oldName,newName,function(){

							/*
							 * Rename the column name in the RDF schema too
							 */
							LG.rdfOps.renameColumnInRDF.start(oldName,newName,function(){
								// Update Refine to update the column header name
								Refine.update({modelsChanged:true},function(){
									// Re-highlight the columns as renaming causes a column header reset
									self.highlightColumns();
								});
							});

							/*
							 * Store the new column label as the safe-guard original name.
							 */
							el.data("original-name",el.val());

						});

					} else {
						// If the input has a bad status when blurring
						// Restore the input field value using it's original label.
						el.val(el.data("original-name"));
					}
					// If this is not the input element
				} else if($(this).data("original-name") == el.val()){
					// Do nothing if the same name has been entered and blurring
				} else if($(this).hasClass("column-description")){
					// Do nothing if it's the textarea and blurring
				} else {
					// Replace the input value with the safe-guard original name
					$(this).val(el.data("original-name"));
				}

			});

			/*
			 * Setup interaction for the "Finish" button
			 * 
			 * The "Finish" button is the finalisation button, when all other panels 
			 * and tasks have been completed, this will trigger:
			 * 
			 * - Validation for the labels and descriptions
			 * - Finalising the RDF (saving columns that haven't been involved in the wizards)
			 * - Sending the data off to the server
			 */
			this.els.finishButton.click(function(){

				/*
				 * TODO: Make checks to see if the user has visited the other panels,
				 * as they might head for the Finish button after just using the wizards.
				 */

				// Check the statuses for the row and column descriptions
				var error = false;
				if($("div.row-description").hasClass("maybe") || $("div.row-description").hasClass("bad")){
					error = true;
				}
				$("div.column-list ul li").each(function(){
					if($(this).hasClass("maybe") || $(this).hasClass("bad")){
						error = true;
					}
				});
				// If any of the statuses are "bad" or "maybe"
				if(error){
					// Tell the user they cannot proceed until they have manually visited each input element.
					alert("Some labels still need to be checked, please make sure you have checked the row description and all of the columns." +
							"\n\n" +
							"You do not need to change every value, but we need to make sure you have checked them, so you you are required to visit " +
					"each label input as a precaution. The status of each input will then change depending on it's value.");
				} else {
					// Remove the highlights from the table headers
					$("td.column-header").each(function(){
						$(this).removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great");
					});
					// Begin finalising the RDF
					LG.rdfOps.saveLabelsToRDF.init();
				}

			});

		},

		/*
		 * displayPanel
		 * 
		 * What happens when a user clicks on the Labelling tab
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
			this.els.finishButton.css("display","inline-block");
			// Show this panel
			this.body.show();	
			// Scroll the panel to the top
			$("div#labelling-panel").scrollTop(0);

		},

		/*
		 * buildColumnDescriptionInputs
		 * 
		 * Builds and injects a <ul> list of input and textarea elements for each column
		 * for the user to enter labels & descriptions
		 */
		buildColumnDescriptionInputs : function(){

			var self = this;
			/*
			 * Create the input fields for the column labels and descriptions - adding 
			 * a CSS class to them to highlight their acceptability status.
			 */
			// Hide the current list if it's showing
			$("div.column-list").hide();

			var html = "<ul>";

			// Iterate through each column using Refine's columnModel		
			for(var i=0;i<theProject.columnModel.columns.length;i++){

				// Convert HTML entities (e.g. "&amp;" to "&")
				var colName = LG.decodeHTMLEntity(theProject.columnModel.columns[i].name);
				/*
				 * Only create a label and description input for a column if it's not in the hidden 
				 * columns list (because these columns aren't stored in the data)
				 */
				if($.inArray(colName, LG.vars.hiddenColumns.split(",")) < 0){
					/*
					 * Column name status can be:
					 * great - label and description entered
					 * good - user has entered a name
					 * bad - is too short or contains the word "column"
					 * maybe - could be fine
					 */
					var status = "maybe";
					var description = "Enter a description...";

					/*
					 * Check to see if the column already has pre-entered values in the 
					 * local labelsAndDescriptions object.
					 * 
					 * The local labelsAndDescriptions object is used to temporarily store the labels and descriptions in the 
					 * labels and descriptions panel so the user can switch between the panels without losing any 
					 * information they have entered.					 
					 */
					var labelData = LG.vars.labelsAndDescriptions;

					if(labelData.cols.length > 0){

						$("div.row-description input.row-label").val((labelData.rowLabel != "Each row is a..." ? labelData.rowLabel : "Each row is a..."));
						$("div.row-description textarea.row-description").val((labelData.rowDescription != "Enter a description..." ? labelData.rowDescription : "Enter a description..."));
						$("div.row-description").addClass((labelData.rowStatus.length > 0 ? labelData.rowStatus : "bad"));

						for(var j=0; j<labelData.cols.length; j++){
							// If the column has been labelled already
							if(labelData.cols[j].label == colName){
								// Grab the description
								description = labelData.cols[j].description;
								// Grab the current status
								status = labelData.cols[j].status;
								// Break out of the loop
								j = labelData.cols.length-1;
								// Else if the column hasn't been labelled yet
							} else if(j == labelData.cols.length-1){
								// Else if the name is less than three characters or contains the word "column"
								if(colName.length < 3 || colName.toLowerCase().indexOf("column") > -1){
									status = "bad";
								}
							}
						}
					} else {
						// Else if the name is less than three characters or contains the word "column"
						if(colName.length < 3 || colName.toLowerCase().indexOf("column") > -1){
							status = "bad";
						}
					}

					// Create the HTML
					html += "<li class='"+status+"'>" +
					"<input class='column-label' value='"+colName+"' />" +
					"<textarea class='column-description' value='"+description+"'>"+description+"</textarea>" + 
					"</li>";

					// Highlight the column header
					$(LG.getColumnHeaderElement(colName)).addClass(status);
				}
			}

			html += "</ul>";

			// Replace/inject the HTML into the column-list div on the labelling panel
			$("div.column-list").html(html);

			// Assign each of the column names a safe-guard "original name" which will be used 
			// to prevent saving a column name with a bad status.
			$("div.column-list ul li input.column-label").each(function(){
				$(this).data("original-name",$(this).val());
			});

			/*
			 * After building the list of inputs and textareas, check to see if the local
			 * labelsAndDescriptions object doesn't exist, in which case, attempt to load the labels 
			 * and descriptions from any RDF saved previously.
			 */
			var labelData = LG.vars.labelsAndDescriptions; 
			var colData = labelData.cols;

			if(labelData.cols.length < 1){

				// Load the row and column labels and descriptions from the 
				// RDF into the according inputs and textareas.
				// Once loaded, execute the callback.
				self.loadLabelsAndDescriptionFromRDF(function(){

					//$("div.column-list").show(function(){

					// Store the row label and description
					labelData.rowLabel = $("div.row-description input.row-label").val();
					labelData.rowDescription = $("div.row-description textarea.row-description").val();

					// Validate the row label and description
					self.checkRowDescription($("div.row-description"));

					// Populate the local labelsAndDescriptions object so the user can 
					// switch between panels before saving and not lose their entered values.
					$("div.column-list ul li").each(function(){
						colData.push({
							label:$(this).find("input.column-label").val(),
							description:$(this).find("textarea.column-description").val(),
							status:"maybe"
						});
						$(this).find("input.column-label").data("original-name", $(this).find("input.column-label").val());
					});

					$("div.column-list").show();

					//});
				});
			} else {
				// If the local object does exist, then attempt load the row label and descriptions 
				// then go ahead and show the column list.
				$("div.row-description input.row-label").val((labelData.rowLabel != "Each row is a..." ? labelData.rowLabel : "Each row is a..."));
				$("div.row-description textarea.row-description").val((labelData.rowDescription != "Enter a description..." ? labelData.rowDescription : "Enter a description..."));
				$("div.row-description").addClass((labelData.rowStatus.length > 0 ? labelData.rowStatus : "bad"));
				$("div.column-list").show();
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

			log("loadLabelsAndDescriptionFromRDF");

			var self = this;

			// Make sure the RDF schema exists
			if (typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined') {

				var schema = theProject.overlayModels.rdfSchema;

				// Loop throught the RDF root nodes and test the RDF type.
				for(var i=0; i<schema.rootNodes.length; i++){
					if(typeof schema.rootNodes[i].rdfTypes != 'undefined' && schema.rootNodes[i].rdfTypes.length > 0) {

						// If the RDF type is owl:Class then we've found the row label & description
						if(schema.rootNodes[i].rdfTypes[0].curie == "owl:Class"){

							var rowLabel = "", rowDescription = "", rowStatus = "";

							for(var j=0; j<schema.rootNodes[i].links.length; j++){

								// Locate the label and comment and populate the input fields
								// and the local object
								if(schema.rootNodes[i].links[j].curie == "rdfs:label"){
									log("Found owl:Class - "+schema.rootNodes[i].links[j].target.value);
									rowLabel = schema.rootNodes[i].links[j].target.value;
									rowStatus = "good";
									$("div.row-description input.row-label").val(schema.rootNodes[i].links[j].target.value);
									$("div.row-description input.row-label").parent().removeClass("maybe");
									$("div.row-description input.row-label").parent().addClass("good");
								} else if(schema.rootNodes[i].links[j].curie == "rdfs:comment"){
									rowDescription = schema.rootNodes[i].links[j].target.value;
									rowStatus = "great";
									$("div.row-description textarea.row-description").val(schema.rootNodes[i].links[j].target.value)
									$("div.row-description textarea.row-description").parent().removeClass("good").addClass("great");
								}
							}

							LG.vars.labelsAndDescriptions.rowLabel = rowLabel;
							LG.vars.labelsAndDescriptions.rowDescription = rowDescription;
							LG.vars.labelsAndDescriptions.rowStatus = rowStatus;

							// If the type is owl:ObjectProperty
						} else if(schema.rootNodes[i].rdfTypes[0].curie == "owl:ObjectProperty") {

							var colLabel = "", colDescription = "Enter a description...", colStatus = "";

							// Loop through the owl:ObjectProperty links (label & comment)
							for(var j=0; j<schema.rootNodes[i].links.length; j++){
								if(schema.rootNodes[i].links[j].curie == "rdfs:label"){

									// Loop through the label inputs and locate the input with the matching 
									// column label
									$("div.column-list ul li").each(function(){
										if($(this).find("input.column-label").val() == schema.rootNodes[i].links[j].target.value){

											// Labels and descriptions can only be saved if they were validated, 
											// so it's safe to add the "good" status
											$(this).removeClass("maybe").addClass("good");																						
											$(LG.getColumnHeaderElement(schema.rootNodes[i].links[j].target.value)).addClass("good");
											status = "good";

											// We don't need to populate the label input as it's the same, 
											// but do it anyway
											$(this).find("input.column-label").val(schema.rootNodes[i].links[j].target.value);
											colLabel = schema.rootNodes[i].links[j].target.value;

											// If there is a rdfs:comment for the owl:objectProperty, 
											// there will be 2 links
											if(schema.rootNodes[i].links.length == 2){

												// For the "link" object found to contain the label, use the other link object (the comment) 
												// to populate the column's description input.
												// (j?0:1) means use the opposite of j
												$(this).find("textarea.column-description").val(schema.rootNodes[i].links[(j?0:1)].target.value);
												colDescription = schema.rootNodes[i].links[(j?0:1)].target.value;

												// Check to see if there's a valid description, 
												// in which case, give the column a "great" status
												if(schema.rootNodes[i].links[(j?0:1)].target.value.length > 2){

													// Highlight the input & column header
													$(this).removeClass("good").addClass("great");											
													$(LG.getColumnHeaderElement(schema.rootNodes[i].links[j].target.value)).addClass("great");
													status = "great";
												}
											} else {
												// Column only has a label and no description
											}
										}
									});

									j = schema.rootNodes[i].links.length-1;
								}
							}

							// Add the column's label and description to the local 
							// labelsAndDescriptions object
							LG.vars.labelsAndDescriptions.cols.push({
								label:colLabel,
								description:colDescription,
								status:colStatus
							});
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
			var status = "";

			// Add the status's CSS class
			if(input.val().trim().length > 2 && input.val() != "Each row is a..."){
				status = "good";
				if(textarea.val().length > 2 && textarea.val() != "Enter a description..."){
					status = "great";
				} else {
					status = "good";
				}
			} else {
				status = "bad";
			}

			// Update the row descriptions class
			divElement.removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great").addClass(status);
			// Store the values in the global labels object
			labelData.rowLabel = input.val();
			labelData.rowDescription = textarea.val();
			labelData.rowStatus = status;


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
				status = "good";
				/*
				 * If the description value is not equal to the holding text, add the "great" 
				 * status.
				 */
				if(textarea.val().length > 2 && textarea.val() != "Enter a description..."){
					status = "great";
				} else {
					status = "good";			
				}
			} else {
				status = "bad";
			}

			liElement.removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great").addClass(status);

			/*
			 * Store or update the column description in the local object.
			 */
			var colFound = false;

			for(var i=0; i<colData.length; i++){
				// Find the existing column description using the "data-original-name" attribute
				// attached to the input element. This doesn't get destroyed as the user 
				// enters a new column name - allowing us to find it's description and status.
				if(colData[i].label == input.data("original-name")){
					colData[i].description = textarea.val();
					colData[i].status = status;
					i=colData.length-1;
					colFound = true;
				} else if(i == colData.length-1 && !colFound){
					colData.push({
						label : input.val(),
						description : textarea.val(),
						status : status
					});
				}
			}

			/*
			 * Highlight the column header
			 * 
			 * We use decodeHTMLEntity here because we are testing against the name from the  
			 * table header which is a HTML element
			 */
			$("td.column-header span.column-header-name").each(function(){
				if(LG.decodeHTMLEntity($(this).html()) == input.val()){
					var el = $(this).parent().parent();
					el.removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great").addClass(status);
				}
			});
		},

		highlightColumns:function(){

			// Iterate through each column using Refine's columnModel		
			for(var i=0;i<theProject.columnModel.columns.length;i++){

				// Convert HTML entities (e.g. "&amp;" to "&")
				var colName = LG.decodeHTMLEntity(theProject.columnModel.columns[i].name);

				/*
				 * Column name status can be:
				 * great - label and description entered
				 * good - user has entered a name
				 * bad - is too short or contains the word "column"
				 * maybe - could be fine
				 */
				var status = "maybe";
				if(LG.vars.labelsAndDescriptions.cols.length > 0){
					for(var j=0; j<LG.vars.labelsAndDescriptions.cols.length; j++){
						// If the column has been labelled already
						if(LG.vars.labelsAndDescriptions.cols[j].label == colName){
							// Grab the current status
							status = LG.vars.labelsAndDescriptions.cols[j].status;
							j = LG.vars.labelsAndDescriptions.cols.length-1;
							// Else if the column hasn't been labelled yet
						} else if(j == LG.vars.labelsAndDescriptions.cols.length-1){
							// Else if the name is less than three characters or contains the word "column"
							if(colName.length < 3 || colName.toLowerCase().indexOf("column") > -1){
								status = "bad";
							}
						}
					}
				} else {
					// Else if the name is less than three characters or contains the word "column"
					if(colName.length < 3 || colName.toLowerCase().indexOf("column") > -1){
						status = "bad";
					}
				}

				// Highlight the column header
				$(LG.getColumnHeaderElement(colName)).addClass(status);

			}
		}

}
