/*
 * wizardsPanel.js
 * 
 * Holds all functions external and generic to the wizards 
 * themselves.
 * 
 * Responsible for things such as loading the wizards, displaying 
 * the correct buttons, generic features such as column selection, 
 * restoring wizards, unexpected value testing.
 */
var LinkedGov_WizardsPanel = {

		/*
		 * A list of wizard IDs to use as keys.
		 */
		wizardNames:[
		         "addressWizard",
		         "dateTimeWizard",
		         "geolocationWizard",
		         "measurementsWizard",
		         "columnsToRowsWizard",
		         "rowsToColumnsWizard",
		         "nullValueWizard",
		         "enumerationWizard"
		],
		
		/*
		 * loadWizardScripts
		 * 
		 * Each wizard has it's own script which needs to be loaded.
		 * 
		 * To prevent cross-browser AJAX loading issues (Safari), these script loads are chained
		 * together, which once complete trigger the HTML load.
		 * 
		 * Once the scripts have loaded, load each wizards HTML.
		 */
		loadWizardScripts : function(index){

			//log("loadWizardScripts");
			
			var self = this;
		
			// Load the script using the wizardNames keys
			$.getScript("extension/linkedgov/scripts/project/wizards/"+self.wizardNames[index]+".js",function(){
				
				// Once the script has loaded, assign it as a wizard inside the "wizards" array in the global
				// LG object.
				// "LG.wizards[self.wizardNames[index]]" is the same as using 
				// "LG.wizards.addressWizard"
				switch(self.wizardNames[index]){
				case  "addressWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_addressWizard;
					break;
				case  "dateTimeWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_dateTimeWizard;
					break;
				case  "geolocationWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_geolocationWizard;
					break;
				case  "measurementsWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_measurementsWizard;
					break;
				case  "columnsToRowsWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_columnsToRowsWizard;
					break;
				case  "rowsToColumnsWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_rowsToColumnsWizard;
					break;
				case  "nullValueWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_nullValueWizard;
					break;
				case  "enumerationWizard" :
					LG.wizards[self.wizardNames[index]] = LinkedGov_enumerationWizard;
					break;
				}
				
				// If we haven't finished looping through the wizardNames
				if(index < self.wizardNames.length-1){
					// Move on to the next wizard by incrementing index
					index = index+1;
					self.loadWizardScripts(index);
				} else {
					// Once we've looped through each of the wizardNames keys,
					// proceed to load each wizard's HTML.
					self.loadHTML();
				}
			});
		},

		/*
		 * loadHTML
		 * 
		 * Each wizard also has it's own HTML that needs to be injected 
		 * into the "wizard-bodies" <div>.
		 */
		loadHTML : function(){

			//log("loadHTML");
			
			var self = this;
			
			// Load the wizard panel skeleton including the wizard questions
			ui.typingPanel._el.wizardsPanel.html(DOM.loadHTML("linkedgov", "html/project/panels/wizardsPanel.html", function(){

				/* 
				 * Load each wizards' HTML into the wizard-bodies element.
				 * 
				 * Interval needed as a fix for object-creation timing issues.
				 * TODO: Remove interval if possible.
				 */				
				var interval = setInterval(function(){
					// Test to see if the wizards housing object has been created
					// TODO: Not sure why this doesn't get created in time, but can't 
					// get round not having to use an interval.
					if(typeof LG.wizards != 'undefined'){
						self.loadWizardHTML(0);
						clearInterval(interval);
					} else {
						log("LG.wizards hasn't been created yet");
					}
				},100);				
			}));
		},

		/*
		 * loadWizardHTML
		 * 
		 * Recursive function to load each wizard's HTML 
		 */
		loadWizardHTML:function(index){
			
			//log("loadWizardHTML");
			
			var self = this;
			
			DOM.loadHTML("linkedgov", "html/project/wizards/"+self.wizardNames[index]+".html", function(response){

				// Store the element to inject the wizard HTML into
				var wizardBodiesEl = ui.typingPanel._el.wizardsPanel.find("div.wizard-bodies");
				wizardBodiesEl.html(wizardBodiesEl.html()+response);	
			
				// Store the HTML element inside the actual wizard object as it's body
				wizardBodiesEl.find("div.wizard-body").each(function(){
					 if($(this).attr("rel") == self.wizardNames[index]){
						 LG.wizards[$(this).attr("rel")].vars.body = $(this);
					 }
				});
				
				// Load each wizards' HTML into the wizard-bodies element
				if(index < self.wizardNames.length-1){
					index = index+1;
					self.loadWizardHTML(index);
				}
			});

		},
		/*
		 * Sets up the initial interaction for the wizardsPanel
		 */
		initialise:function(){

			var self = this;
						
			self.els = ui.typingPanel._el;
			self.body = self.els.wizardsPanel;
			self.actionBar = self.els.actionBar;

			/*
			 * Begin loading wizard scripts starting with the first
			 */
			self.loadWizardScripts(0);
			
			/*
			 * Interaction when clicking on a wizard header
			 */
			self.body.find('a.wizard-header').live("click",function() {
				self.showWizard($(this).attr("rel"));
			});

			/*
			 * Interaction for collapsing and expanding the wizard 
			 * questions.
			 */
			self.els.collapseExpandButton.click(function() {
				if(!$(this).data("hasBeenClicked")){
					$(this).html("+");
					$(this).attr("title","Expand wizards");
					$("a.wizard-header").each(function(){
						$(this).fadeOut(250,function(){
							$(this).addClass("collapsed");
							$(this).fadeIn(250);
						});
					});
					$(this).data("hasBeenClicked",true);
				} else {
					$(this).html("-");
					$(this).attr("title","Collapse wizards");
					$("a.wizard-header").each(function(){
						$(this).fadeOut(250,function(){
							$(this).removeClass("collapsed");
							$(this).fadeIn(250);
						});
					});
					$(this).data("hasBeenClicked",false);
				}
			});

			/*
			 * Interaction for "Back" button.
			 */
			self.els.returnButton.click(function(){
				self.destroyColumnSelector();
				self.showQuestions();
			});
			
			/*
			 * Interaction for "example" links in wizards that show/hide 
			 * a paragraph of text.
			 */
			$("div.description a.ex").live("click",function(){
				if($(this).next().css("display") == "none"){
					$(this).next().css("display","block");
				} else {
					$(this).next().hide();
				}
			});

			/*
			 * When each wizards' "Update" button is clicked, 
			 * their corresponding wizard function is called. Each of the 
			 * wizards have "bind" attributes in their HTML code, which 
			 * allows access to the individual elements through the object
			 * "elmts".
			 */
			self.els.updateButton.click(function(){

				self.destroyColumnSelector();

				var wizardObject = LG.wizards[self.els.actionButtons.attr("rel")];
				wizardObject.initialise(DOM.bind(self.body));
			});

			self.els.undoButton.click(function(){

				self.destroyColumnSelector();
				var wizardObject = LG.wizards[$(this).parent().attr("rel")];

				/*
				 * Undo the operations executed by the wizard for the most recent 
				 * wizard completion.
				 */
				self.undoWizardOperations(wizardObject.vars.historyRestoreID);

				var array = LG.vars.hiddenColumns.split(",");
				if(typeof wizardObject.vars.hiddenColumns != 'undefined'  && wizardObject.vars.hiddenColumns.length > 0) {
					for(var i=0; i<array.length; i++){
						for(var j=0; j<wizardObject.vars.hiddenColumns.length; j++){
							if(array[i] == wizardObject.vars.hiddenColumns[j]){
								LG.unhideHiddenColumn(array[i]);
								wizardObject.vars.hiddenColumns.splice(j,1);
								j--;
							}
						}
					}	
				}

				$(this).hide();

			});

			/*
			 * Interaction for the column selector button. 
			 * 
			 * Slight differences with how the select input is displayed 
			 * depends on what type of "mode" is passed as a parameter.
			 * 
			 * Modes:
			 * default - produces column list with select inputs for fragments
			 * splitter - produces a single column with no select inputs for fragments
			 * single-column - only allows the user to select one column
			 * 
			 */
			$("div.selector a.selectColumn").live("click",function(){
				if($(this).hasClass("splitter")){
					self.buttonSelector($(this),"splitter");			
				} else if($(this).hasClass("single-column")){ 
					self.buttonSelector($(this),"single-column");
				} else if($(this).hasClass("text-input")){ 
					self.buttonSelector($(this),"text-input");			
				} else {
					self.buttonSelector($(this),"default");			
				}
			});

			// 'Remove column' interaction for column lists in wizards
			$("div.wizard-body ul.selected-columns li span.remove").live("click",function(){
				self.removeColumn($(this));
			});
			
			// Preview widget for wizards
			$("div.preview a.button").live("click",function(){
				self.generateWizardPreview($(this));
			});
			
			// Show and position tooltips
			$("a.info").live("mouseover",function () {
				$(this).next("span").css("top",($(this).offset().top-($(this).next("span").height()/2))+"px").show();
			}).live("mouseout",function () {
				$(this).next("span").hide();
			});

			// Interaction for "Next" button.
			self.els.nextButton.click(function(){
				$("ul.lg-tabs li a[rel='linking-panel']").click();
			});

			// Set up more user interaction but slightly more specific to each wizard.
			self.setupWizardInteraction();

		},

		/*
		 * displayPanel
		 * 
		 * Shows the wizard panel regardless of what's currently being 
		 * shown in the Typing panel
		 */
		displayPanel: function(){
			var self = this;
			// Hide the other panels
			LG.panels.typingPanel.hidePanels();
			// Show this panel
			this.body.show();
			// Show the action bar
			this.els.actionBar.show();

			// Make sure the panel's showing the right thing

			// Show buttons depending on what panel is 
			// being shown
			if($("div.questions").css("display") != "none"){
				// Hide the action buttons
				this.els.actionButtons.hide();
				// Show the collapse-expand button
				this.els.collapseExpandButton.show();
				// Hide the "return to wizards" button
				this.els.returnButton.hide();
				// Show the finish button
				this.els.finishButton.hide();
				// Show the Next button
				this.els.nextButton.show();
			} else {
				// Hide the question collapse button
				self.els.collapseExpandButton.hide();
				// Show the "back" button
				self.els.returnButton.show();
				// Show the "Update" button
				self.els.updateButton.show();
				// Hide the finish button
				self.els.finishButton.hide();
				// Show the action buttons
				self.els.actionButtons.show();	
			}
		},

		/*
		 * showQuestions
		 * 
		 * Shows the wizard questions
		 */
		showQuestions:function(){
			// Hide all wizards
			this.body.find("div.wizard-bodies").hide();
			// Show the questions
			this.body.find("div.questions").show();
			// Hide the action buttons
			this.els.actionButtons.hide();
			// Show the collapse-expand button
			this.els.collapseExpandButton.show();
			// Hide the "return to wizards" button
			this.els.returnButton.hide();
			// Show the finish button
			this.els.finishButton.hide();
			// Show the Next button
			this.els.nextButton.show();
		},

		/*
		 * showWizard
		 * 
		 * Displays a specific wizard
		 */
		showWizard: function(wizardName){
			
			var self = this;
			
			// Hide the wizard questions
			this.body.find("div.questions").hide();
			// Hide all wizards
			this.body.find("div.wizard-body").hide();
			// Make sure the wizard panel can be seen
			this.body.find("div.wizard-bodies").show();
			// Show the chosen wizard
			//this.body.find("div.wizard-body[rel='"+wizardName+"']").show();
			this.body.find("div.wizard-body").each(function(){
				if($(this).attr("rel") == wizardName){
					$(this).show();
					$(this).scrollTop(0);
				}
			});
			//this.body.find("div.wizard-bodies").find("div.wizard-body").show()
			// Hide the question collapse button
			self.els.collapseExpandButton.hide();
			// Show the "back" button
			self.els.returnButton.show();
			// Show the "Update" button
			self.els.updateButton.show();
			// Hide the finish button
			self.els.finishButton.hide();
			// Hide the Next button
			self.els.nextButton.hide();
			// Update the div.action-buttons rel attribute to relate to the specific wizard
			self.els.actionButtons.attr("rel",wizardName);
			// Show the action buttons
			self.els.actionButtons.show();		

			
			//LG.panels.typingPanel._el.actionBar.find("div.action-buttons").find("a.update").attr("bind",$("div.wizard-body").find("a.update").attr("bind"));

			switch(wizardName){

			case "measurementsWizard" : 

				// make the measurements text field auto suggest
				$("#unitInputField").suggest({
					"type": "unit"
				}).bind("fb-select", function (e, data) {
					//alert(data.name + ", " + data.id);
				});

				break;

			case "columnsToRowsWizard" :

				/*
				 * If the wizard contains a range selector, retrieve the 
				 * column header names and populate the select inputs.
				 */
				$("div.rangeSelect").find("div.selector").children("div.range").hide();
				self.populateRangeSelector($("div.rangeSelect").find("div.selector").children("div.range"), function(){
					$("div.rangeSelect").find("div.selector").children("div.range").slideDown();					
				});

				break;
				
			default:
				break;

			}


		},

		/*
		 * setupWizardInteraction
		 * 
		 * Sets up more specific user interaction for wizards.
		 */
		setupWizardInteraction : function() {

			var self = this;
			/*
			 * Interaction for the column range select inputs
			 */
			$("div.selector div.range select").live("change",function () {
				self.rangeSelector($(this));
			});

			/*
			 * "Split address" checkbox
			 */
			$('div.wizard-body input.split').live("change",function(){
				if($(this).attr("checked")){
					$(this).parent().children("div.split").slideDown();
				} else {
					$(this).parent().children("div.split").slideUp();
				}
			});

			/*
			 * Interaction for "split" button in address wizard.
			 */
			$("div.split a.splitter-split").live("click",function(){
				var name = $(this).parent().find("ul.selected-columns").children("li").eq(0).children("span.col").html();
				var separator = $(this).parent().find("input.splitCharacter").val();
				var splitElement = $(this).parent();
				if(separator.length < 1 || name.length < 1){
					alert("You need to make sure you have selected a column to split and entered a character to split by.");
				} else {
					LG.ops.splitVariablePartColumn.initialise(name, separator, splitElement, function(){
						$("input#address-split").removeAttr("checked");
						$("div.split").hide();
					});
				}
			});

			/*
			 * Date/time interaction for column lists
			 */
			$("ul.date-checkboxes span.dateFrags input[type='checkbox']").live("change",function(){

				/*
				 * Construct a date fragment string: e.g. Y-D-M-h
				 */
				var dateString = "";
				$.each($(this).parent("span").children("input"),function(){
					if($(this).attr("checked")){
						dateString += $(this).val()+"-";
					}
				});
				dateString = dateString.substring(0,dateString.length-1);
				//log(dateString);

				if(dateString.length > 0) {
					$(this).parent("span").parent("li").children("span.duration").data("olddisplay","block");
					$(this).parent("span").parent("li").children("span.duration").slideDown(250);
				} else {
					$(this).parent("span").parent("li").children("span.duration").slideUp(250);
				}

				/*
				 * Detect day and month selection
				 */
				if(dateString.indexOf("M-D") >= 0){
					//alert("day and month selected");

					// Display input to specify day-month order
					$(this).parent("span").parent("li").children("span.mb4d").data("olddisplay","block");
					$(this).parent("span").parent("li").children("span.mb4d").slideDown(250);

					if(dateString.indexOf("Y") < 0){
						// Display the year input
						$(this).parent("span").parent("li").children("span.year").data("olddisplay","block");
						$(this).parent("span").parent("li").children("span.year").slideDown(250);
						$(this).parent("span").parent("li").children("span.unseparated").slideUp(250);
					} else {
						// Year, month, day selected
						$(this).parent("span").parent("li").children("span.year").slideUp(250);
						$(this).parent("span").parent("li").children("span.unseparated").data("olddisplay","block");
						$(this).parent("span").parent("li").children("span.unseparated").slideDown(250);
					}
				} else {
					$(this).parent("span").parent("li").children("span.mb4d").slideUp(250);
					$(this).parent("span").parent("li").children("span.year").slideUp(250);
					$(this).parent("span").parent("li").children("span.unseparated").slideUp(250);
				}

				/*
				 * Detect hour and minute selection
				 */
				if(dateString.indexOf("h-m") >= 0){
					//alert("hours and minutes selected");
					if(dateString.indexOf("D") < 0){
						$(this).parent("span").parent("li").children("span.day").find("input.datepicker").datepicker("destroy").datepicker({
							changeYear:true,
							changeMonth:true,
							dateFormat: 'dd/mm/yy'
						});
						$(this).parent("span").parent("li").children("span.day").data("olddisplay","block");
						$(this).parent("span").parent("li").children("span.day").slideDown(250);
					} else {
						$(this).parent("span").parent("li").children("span.day").slideUp(250);
					}
				} else {
					$(this).parent("span").parent("li").children("span.day").slideUp(250);
				}

			});

			/*
			 * Detect date duration selection
			 */
			$("ul.date-checkboxes input.duration").live("change",function(){
				if($(this).attr("checked")){
					$(this).parent("span").parent("li").children("span.duration").find("div.duration-input").data("olddisplay","block");
					$(this).parent("span").parent("li").children("span.duration").find("div.duration-input").slideDown(250);				
				} else {
					$(this).parent("span").parent("li").children("span.duration").find("div.duration-input").slideUp(250);
				}
			});

			/*
			 * Detect unseparated date selection
			 */
			$("ul.date-checkboxes input.unseparated").live("change",function(){
				if($(this).attr("checked")){
					$(this).parent("span").parent("li").children("span.unseparated").find("div.unseparated-input").data("olddisplay","block");
					$(this).parent("span").parent("li").children("span.unseparated").find("div.unseparated-input").slideDown(250);				
				} else {
					$(this).parent("span").parent("li").children("span.unseparated").find("div.unseparated-input").slideUp(250);
				}
			});

			/*
			 * Interaction for address column options
			 */
			$("ul.address-fragments span.colOptions select").live("change",function(){
				if($(this).val() == "mixed"){
					$(this).parent("span").parent("li").find("span.postcode").data("olddisplay","block");
					$(this).parent("span").parent("li").find("span.postcode").slideDown(250);
				} else {
					$(this).parent("span").parent("li").find("span.postcode").slideUp(250);
				}
			});

			/*
			 * Blank value highlighting for the blank values wizard
			 */
			$("input#nullValueInputField").live("keyup",function(){
				var val = $(this).val();
				$("table.data-table tr td div.data-table-cell-content span").each(function(){
					if($(this).html() == val) {
						$(this).parent().parent().addClass("blankValueHighlight");
					} else {
						$(this).parent().parent().removeClass("blankValueHighlight");
					}
				})
			});
			$("input#nullValueInputField").live("focus",function(){
				var val = $(this).val();
				if(val.length > 0){
					$("table.data-table tr td div.data-table-cell-content span").each(function(){
						if($(this).html() == val) {
							$(this).parent().parent().addClass("blankValueHighlight");
						}
					});
				}
			});	
			$("input#nullValueInputField").live("blur",function(){
				$("table.data-table tr td").removeClass("blankValueHighlight");
			});

		},

		/*
		 * buttonSelector
		 * 
		 * Upon clicking the "Select" button in each wizard to select columns, 
		 * the jQuery UI "selectable" plugin is invoked and the callbacks for 
		 * for the selection actions populate a list in the wizard.
		 */
		buttonSelector : function(button, selectType) {

			var self = this;
			/* 
			 * mode can be used to generate different HTML for the select columns.
			 * 
			 * e.g. Select columns for the date and time wizard are different to the 
			 * columns selected for the address wizard as they need to contain different 
			 * options.
			 */
			var mode = selectType || "default";

			/*
			 * If the button does not have the class "selecting", then the user is wanting to 
			 * select columns.
			 */
			if (!$(button).hasClass("selecting")) {

				/*
				 * Exposes the column headers - 'true' to mask.
				 */
				LG.exposeColumnHeaders(true);

				$(button).after('<span class="column-selecting-icon"><img src="extension/linkedgov/images/column_selecting.gif" /></span>');

				/*
				 * Remove any existing column selectors on the page
				 */
				self.destroyColumnSelector();

				/*
				 * Change the button label to "End Select" and add a CSS
				 * class to it.
				 */
				$(button).html("Finish picking");
				$(button).addClass("selecting");

				/*
				 * Cache the location of the selected columns (some may already be present)
				 */
				$cols = $(button).parent().children("ul.selected-columns");

				/*
				 * Invoke the "selectable" plugin on the data table, and only allow the user to select 
				 * "td.column-header" elements, then handle the various interactions.
				 */
				$("table.data-header-table").selectable({
					filter: 'td.column-header',
					selected: function (event, ui) {
						/*
						 * Element selected.
						 * 
						 * If the selected column is not the "All" column
						 */
						if($(ui.selected).children().find(".column-header-name").html() != "All"){
							/*
							 * Assume it will be added to the list of selected columns
							 */
							var addToList = true;
							/*
							 * Loop through any existing select columns in the list 
							 */
							$cols.children("li").children("span.col").each(function(){
								/*
								 * Check if selected column already exists in the list.
								 * 
								 * If it already exists, assume the user is wanting to 
								 * deselect the column.
								 */
								if($(this).html() == $(ui.selected).children().find(".column-header-name").html()){

									/*
									 * Remove the column from the select columns list and remove the highlighted 
									 * "ui-selected" class from the column header in the data table.
									 */
									$(this).parent("li").remove();
									$(ui.selected).removeClass("ui-selected");
									$(ui.selected).removeClass("selected");

									LG.deselectColumn($(ui.selected).children().find(".column-header-name").html());

									/*
									 * Check to see if there are any selected columns still present in the list, 
									 * which if there aren't, hide the list.
									 */
									if($cols.children("li").length < 1){
										$cols.html("").hide();
									} else {
										$cols.show();
									}
									/*
									 * If a selected column exists in the list, but hidden by the 
									 * "skip" class, then show the selected column again.
									 */
									if($(this).parent().hasClass("skip")){
										$(this).parent().removeClass("skip").show();
									}

									/*
									 * If the column already exists in the list, then we don't want to 
									 * add another entry for it.
									 */
									addToList = false;
								}
							});

							/*
							 * If the selected column doesn't already exist in the selected columns list,
							 * create an entry in the list for it, depending on the mode parameter for the 
							 * column list.
							 * 
							 * Each mode calls the getFragmentData() function, passing the column-list that 
							 * has a class attached to the element to determine what HTML to inject into each 
							 * column entry.
							 */
							if(addToList){

								switch(mode){

								case "default" :
									/*
									 * default - allows multiple columns to be added to the list.
									 */
									$cols.append( 
											"<li>" +
											"<span class='col'>" + 
											$(ui.selected).children().find(".column-header-name").html() + 
											"</span>" + 
											"<span class='remove'>X</span>" +
											self.getFragmentData($cols) +
											"</li>"
									)
									.show();
									break;

								case "single-column" :
									/*
									 * single-column - only allows one column to be selected - hence the use 
									 * of html() instead of append().
									 */
									$cols.html( 
											"<li>" +
											"<span class='col'>" + 
											$(ui.selected).children().find(".column-header-name").html() + 
											"</span>" + 
											"<span class='remove'>X</span>" +
											self.getFragmentData($cols) +
											"</li>"
									)
									.show();							
									break;

								case "splitter" :
									/*
									 * splitter - only allows one column to be selected and doesn't ask 
									 * for any fragment data. Used in the address wizard to split columns 
									 * containing multiple address parts.
									 */
									$cols.html(
											"<li>" +
											"<span class='col'>" + 
											$(ui.selected).children().find(".column-header-name").html() + 
											"</span>" + 
											"<span class='remove'>X</span>" +
									"</li>")
									.show();	
									break;

								case "text-input" :

									/*
									 * generateColumnFacet returns a list of the 10 most frequently 
									 * occurring <li> elements.
									 */
									self.generateColumnFacet($(ui.selected).children().find(".column-header-name").html(),10,function(html){
										$cols.html(html);
										$cols.data("colName",$(ui.selected).children().find(".column-header-name").html());
										$cols.children("li").each(function(){
											$(this).html(
													"<span class='col'>" +
													$(this).html() +
													"</span>" +
													"<span class='remove'>X</span>" +
													"<span class='colOptions'>" +
													"<input type='text' class='textbox "+$(this).html()+"' />" +
											"</span>");
										});	
										$cols.show();
									});

									break;

								default:
									break;
								}

								$(ui.selected).addClass("selected");

								LG.selectColumn($(ui.selected).children().find(".column-header-name").html());

							}
						} else {
							$(ui.selected).removeClass("ui-selected");
						}
					},
					unselected: function (event, ui) {
						/*
						 * Remove the column from the selected column list when it's 
						 * column header is deselected.
						 */
						var hasEntry = false;
						$cols.children("li").children("span.col").each(function(){
							if($(this).html() == $(ui.unselected).children().find(".column-header-name").html()){
								if(hasEntry){
									$(this).parent("li").remove();
									$(ui.unselected).removeClass("ui-selected");
									$(ui.unselected).removeClass("selected");							
								} else {
									hasEntry = true;
								}
							}
						});
					},
					selecting: function (event, ui) {
						// log("selecting");
					},
					unselecting: function (event, ui) {
						// log("unselecting");
						//$cols.html("").hide();
					}
				});
			} else {
				/*
				 * If the column-selector button has the class "selecting", end 
				 * column selection.
				 */
				$('span.column-selecting-icon').remove();
				/*
				 * Removes the expose for the column headers.
				 */
				LG.exposeColumnHeaders(false);
				self.destroyColumnSelector();
			}	
		},


		/*
		 * populateRangeSelector
		 * 
		 * Takes a div.range element that contains two select inputs as children and 
		 * populate the select inputs with the column names and sets them to the first 
		 * option.
		 */
		populateRangeSelector : function(divRange, callback) {

			callback = callback || function(){return false};

			var columnHeaders = "";
			var i = 0;
			/*
			 * Grab the column names from the data table and present 
			 * them as <option> elements.
			 * 
			 * TODO: Perhaps grab the names from Refine's DOM object 
			 * instead.
			 */
			var colHeaders = ui.dataTableView._columnHeaderUIs;
			for(var i=0, len=colHeaders.length; i<len; i++){
				if(!$(colHeaders[i]._td).hasClass("hiddenCompletely")){
					columnHeaders += "<option data-id='" + i + "' value='" + colHeaders[i]._column.name + "'>" + colHeaders[i]._column.name + "</option>";
				}
			}

			/*
			 * Populate the select inputs with the <option> elements.
			 */
			divRange.children("select").each(function () {
				$(this).html(columnHeaders);
				$(this).val($(this).find("option").eq(0).val());
			});

			callback();

		},

		/*
		 * rangeSelector
		 * 
		 * When selecting a range of columns using two select inputs (e.g. 
		 * in the Multiple Columns wizard), this function is called regardless
		 * of which select input is changed and uses the selects' CSS class to 
		 * distinguish which one is which (.from & .to).
		 * 
		 * Also adds basic validation to the select inputs so that when 
		 * a value is picked in the "From" select input, all values before 
		 * that value in the "To" select input are disabled, and vice versa.
		 */
		rangeSelector : function(select) {

			var self = this;

			LG.exposeColumnHeaders(true);

			/*
			 * Remove any jQueryUI selectable stuff if the user has been 
			 * selecting columns before this.
			 */
			//self.destroyColumnSelector();

			/*
			 * Cache and hide the selected column list
			 */
			$cols = $(select).parent().parent().children("ul.selected-columns");
			$cols.html("").hide();
			/*
			 * Create a var to append the innerHTML of the select inputs to (the 
			 * column names), and two way-points for the range (i.e. a min and max)
			 * that begin at 0 as no columns have been selected yet.
			 */
			var colsHTML = "";
			var from = 0, to = 0;

			/*
			 * If the "from" select input has been changed.
			 */
			if ($(select).hasClass("from")) {
				/*
				 * Use the "data-id" attribute of the option element as the column index.
				 * The option "value" is the column name.
				 */
				from = parseInt($(select).find("option[value='" + $(select).val() + "']").attr("data-id"));
				/*
				 * Loop through the list of the other select inputs's options (the "To" select input)
				 * and disable any option that has a "data-id" (column index) that's less than or equal
				 * to the column that's been selected - otherwise enable it.
				 */
				$(select).parent().find("select.to").children("option").each(function() {
					if (parseInt($(this).attr("data-id")) <= from) {
						$(this).attr("disabled", "true");
					} else {
						$(this).removeAttr("disabled");
					}
				});
			} else if ($(select).hasClass("to")) {

				to = parseInt($(select).find("option[value='" + $(select).val() + "']").attr("data-id"));
				/*
				 * Loop through the list of the other select inputs's options (the "From" select input)
				 * and disable any option that has a "data-id" (column index) that's greater than or 
				 * equal to the column that's been selected - otherwise enable it.
				 */
				$(select).parent().find("select.from").children("option").each(function () {
					if (parseInt($(this).attr("data-id")) >= to) {
						$(this).attr("disabled", "true");
					} else {
						$(this).removeAttr("disabled");
					}
				});
			}

			/*
			 * Populate the selected column list accordingly.
			 * 
			 * Loop through the select input's options that has been changed
			 */
			$(select).find("option").each(function () {

				/*
				 * Cache the select inputs
				 */
				var fromSelect = $(this).parent().parent().children("select.from");
				var toSelect = $(this).parent().parent().children("select.to");
				/*
				 * For each option inside the select input, 
				 * if it's column index is in between the selected "from" column
				 * and the selected "to" column
				 */
				if (parseInt($(this).attr("data-id")) >= 
					parseInt(fromSelect.find("option[value='" + fromSelect.val() + "']").attr("data-id")) 
					&& parseInt($(this).attr("data-id")) <= 
						parseInt(toSelect.find("option[value='" + toSelect.val() + "']").attr("data-id"))) {
					/*
					 * Append the selected column HTML to the list.
					 */
					colsHTML += "<li>" +
					"<span class='col'>" + $(this).val() + "</span>" +  
					"<span class='remove'>X</span>" +
					self.getFragmentData($cols) +
					"</li>";
					
					/*
					 * Add jQuery UI's "selected" styles to the column headers in the
					 * data table.
					 */
					$(LG.getColumnHeaderElement($(this).val())).addClass("selected");
					LG.selectColumn($(this).val());

				}
			});

			if(colsHTML == ""){
				// No columns have been selected
			} else {
				/*
				 * Append the selected column list to the UL element in the wizard and 
				 * show it.
				 */
				$cols.html(colsHTML).show();
			}

		},


		/*
		 * generateColumnFacet
		 * 
		 * Given a column name and a number (count), this will generate an unordered 
		 * list of the (count)-most occuring values in that column
		 */
		generateColumnFacet : function(colName, count, callback){

			var html = "";

			/*
			 * Build a parameter object using the first of the column names.
			 */
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : colName,
						"columnName" : colName,
						"expression" : "value",
						"omitBlank" : false,
						"omitError" : false,
						"selection" : [],
						"selectBlank" : false,
						"selectError" : false,
						"invert" : false
					} ],
					"mode" : "row-based"
			};

			/*
			 * Post a silent facet call.
			 */
			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams)
				},
				success : function(data) {
					/*
					 * Loop through the UI facets
					 */
					//log("data.facets.length = " + data.facets.length);
					for ( var i = 0; i < data.facets.length; i++) {

						/*
						 * If the facet matches the column name and has
						 * choices returned
						 */
						if (data.facets[i].columnName == colName && typeof data.facets[i].choices != 'undefined') {
							/*
							 * Loop through the returned facet choices (count) number of times
							 * and append them to the unordered list.
							 */
							var highest = 0;
							var choices = data.facets[i].choices.length;
							var choicesArray = [];
							for(var j=0; j<choices; j++){

								//log("data.facets[i].choices[j].c = "+data.facets[i].choices[j].c);

								if(data.facets[i].choices[j].c >= highest){
									choicesArray.splice(0,0,data.facets[i].choices[j].v.l);
									highest = data.facets[i].choices[j].c;
								} else {
									choicesArray.push(data.facets[i].choices[j].v.l);
								}
							}

							if(choicesArray.length > count){
								choicesArray.length = count;
							}

							for(var k=0;k<choicesArray.length;k++){
								html += "<li>"+choicesArray[k]+"</li>";
							}

							i=data.facets.length;

							log(html);

							callback(html);

						}
					}
				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

		},

		/*
		 * Destroys the jQuery UI 'selectable' object when a new wizard 
		 * is started/finished.
		 */
		destroyColumnSelector : function() {
			$("div.selector a.selectColumn").html("Pick column");
			$("div.selector a.selectColumn").removeClass("selecting");
			$("table.data-header-table").selectable("destroy");
			$("table.data-header-table .column-header").each(function () {
				$(this).removeClass("ui-selected").removeClass("skip").removeClass("selected");
			});	
		},

		/*
		 * removeColumn
		 * 
		 * Functionality for removing a column from list of 
		 * selected columns.
		 * 
		 * "el" is the column entry's remove sign
		 */
		removeColumn : function(el) {

			/*
			 * Cache the column list
			 */
			$cols = $(el).parent("li").parent("ul");
			/*
			 * Check to see if column being removed is the first or last 
			 * in column selection, in which case it is ok to remove it from 
			 * the range.
			 * 
			 * We're testing that the HTML elements are the same.
			 */
			if($(el).parent("li")[0] === $(el).parent().parent("ul").children().eq(0)[0] || 
					$(el).parent("li")[0] === $(el).parent("li").parent("ul").children("li").eq($(el).parent("li").parent("ul").children("li").length-1)[0]){

				/*
				 * Slide the column entry up
				 */
				$(el).parent().slideUp(250,function(){

					/*
					 * Remove it from the list
					 */
					$(this).remove();

					/*
					 * Continue to remove any column entries that have the class "skip" and are the 
					 * first in the list (as they're not being skipped).
					 */
					while($cols.children("li").length > 0 && $cols.children("li").eq(0).hasClass("skip")){
						$cols.children("li").eq(0).remove();
					}

					/*
					 * If there are no more selected columns left in the list, 
					 * hide the list.
					 */
					if($cols.children("li").length < 1){
						$cols.html("").hide();
					}
				});

				/*
				 * Remove the "selected" styling for the removed columns in the data table
				 */
				$li_el = $(el).parent("li");

				/*
				 * Loop through the column headers in the data table and remove the highlighted 
				 * "ui-selected" class as it's now been deselected.
				 */
				$(LG.getColumnHeaderElement($li_el.find("span.col").html())).removeClass("selected");
				LG.deselectColumn($li_el.find("span.col").html());
				/*
				$("td.column-header div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == $li_el.find("span.col").html()){
						$(this).parent().parent("td").removeClass("selected");
					}
				});
				 */

			} else {
				/*
				 * If the column is inside the range (i.e. not at the beginning or end), add the class "skip" to 
				 * the <li> element to enable the wizard to move it aside when rotating the other columns.
				 */
				$li_el = $(el).parent("li");
				/*
				 * Hide and apply "skip" class
				 */
				$li_el.slideUp(250,function(){
					$(this).addClass("skip");
				});
				/*
				 * Remove highlight from column header in the data table
				 */
				$(LG.getColumnHeaderElement($li_el.find("span.col").html())).removeClass("selected");
				LG.deselectColumn($li_el.find("span.col").html());
				/*
				$("td.column-header div.column-header-title span.column-header-name").each(function(){
					if($(this).html() == $li_el.find("span.col").html()){
						$(this).parent().parent("td").removeClass("ui-selectee ui-selected");
					}
				});	
				 */
			}

		},


		/*
		 * generateWizardPreview
		 * 
		 * NOT BEING USED.
		 * 
		 * Allows you to preview the results on cells of a given 
		 * expression.
		 */
		generateWizardPreview : function(previewButton) {

			var wizardBodyDiv = previewButton.parent("div").parent("div");
			var previewWidgetDiv = previewButton.parent("div");
			$(previewWidgetDiv).find("ul.cell-previews").html("").hide();
			var colNames = [];
			var nameIndex = 0;
			/*
			 * Get the select column names, else display 
			 * error message.
			 */
			var selectedCols = $(wizardBodyDiv).find("ul.selected-columns");
			$(selectedCols).find("li span.col").each(function(){
				colNames.push($(this).html());
			});

			for(var i=0;i<colNames.length;i++){

				/*
				 * Make the preview call
				 */
				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "preview-expression",
					data : {
						expression:"grel:value.toDate(false).toString()",
						cellIndex:Refine.columnNameToColumnIndex(colNames[i])+1,
						repeat:false,
						repeatCount:10,
						rowIndices:"[1,2,3,4,5]"
					},
					success : function(data) {

						var html = "";
						html += "<li>";
						html += "<span>"+colNames[nameIndex]+"</span>";
						html += "<ul class='values'>";

						for(var j=0; j<data.results.length;j++){
							html += "<li>"+data.results[j]+"</li>";
						}

						html += "</ul>";
						html += "</li>";

						/*
						 * Insert into <ul>
						 */		
						$(previewWidgetDiv).find("ul.cell-previews").html($(previewWidgetDiv).find("ul.cell-previews").html()+html).show();

						nameIndex++;
					}
				});
			}


		},

		/*
		 * getFragmentData
		 * 
		 * When creating a column entry in a list of selected columns, each wizard 
		 * has it's own particular options for each column.
		 * 
		 * For columns selected in the date & time wizard - the user has to be able 
		 * to specify what parts of a date or time are contained in a column, whereas 
		 * for the geolocation wizard, the user needs to be able to specify whether the 
		 * columns contain latitude or longitude and so on. 
		 * 
		 * Returns the HTML to append to a column <li> entry.
		 */
		getFragmentData : function(columnList) {

			var fragmentHTML = "";

			/*
			 * Each list of selected columns has an ID bound to it using the 
			 * "bind" attribute.
			 */
			switch (columnList.attr("bind")) {
			case "dateTimeColumns" :

				fragmentHTML = "<span class='dateFrags colOptions'>";

				var symbols = ["Y","M","D","h","m","s"];
				for(var i=0;i<symbols.length;i++){
					fragmentHTML += "<input type='checkbox' class='date-checkbox' value='"+symbols[i]+"' /><span>"+symbols[i]+"</span>";
				}

				fragmentHTML += "</span>";

				// Option to specify that the date/time is a duration
				fragmentHTML += "<span class='colOptions duration'>" +
				"<input type='checkbox' class='duration' value='duration' />" +
				"<span>Duration</span>" +
				"<div class='duration-input'>" + 
				"<input class='duration-value' type='text' />" +
				"<select class='duration'>" +
				"<option value='seconds'>seconds</option>" +
				"<option value='minutes'>minutes</option>" +
				"<option value='hours'>hours</option>" +
				"<option value='days'>days</option>" +
				"<option value='months'>months</option>" +
				"<option value='years'>years</option>" +
				"</select>" +
				"</div>" +
				"</span>";

				// Option for specifying the order of day and month
				fragmentHTML += "<span class='colOptions mb4d'>" +
				"<input type='checkbox' class='mb4d' value='mb4d' />" +
				"<span>Month before day (e.g. 07/23/1994)</span>" +
				"</span>";
				// Input for specifying the year the dates occur in
				fragmentHTML += "<span class='colOptions year'>" +
				"<span>Do you know the year?</span>" +
				"<input type='text' class='year' value='' maxlength='4' />" +
				"</span>";
				// Input for specifying the day the times occur on
				fragmentHTML += "<span class='colOptions day'>" +
				"<span>Do you know the day?</span>" +
				"<input id='datepicker-"+$.generateId()+"' type='text' class='day datepicker' value='' />" +
				"</span>";
				fragmentHTML += "<span class='colOptions unseparated'>" +
				"<input type='checkbox' class='unseparated' value='unseparated' />" +
				"<span>Unseparated date (20090724)</span>" +
				"<div class='unseparated-input'>" + 
				"<select class='duration1'>" +
				"<option value='--'>--</option>" +
				"<option value='year'>Year</option>" +
				"<option value='month'>Month</option>" +
				"<option value='day'>Day</option>" +
				"</select>" +
				"<select class='duration2'>" +
				"<option value='--'>--</option>" +
				"<option value='year'>Year</option>" +
				"<option value='month'>Month</option>" +
				"<option value='day'>Day</option>" +
				"</select>" +
				"<select class='duration3'>" +
				"<option value='--'>--</option>" +
				"<option value='year'>Year</option>" +
				"<option value='month'>Month</option>" +
				"<option value='day'>Day</option>" +
				"</select>" +
				"</span>";

				/*
				 * Add a specific CSS class to the list of columns so CSS styles can 
				 * be applied.
				 */
				columnList.addClass("date-checkboxes");
				break;
			case "addressColumns" :

				fragmentHTML = "<span class='colOptions'>";

				fragmentHTML += 
					"<select class='address-select'>" + 
					"<option value='street-address'>Street Address</option>" + 
					"<option value='extended-address'>Extended Address</option>" +
					"<option value='locality'>Locality</option>" + 
					"<option value='region'>Region</option>" + 
					"<option value='postcode'>Postcode</option>" + 
					"<option value='country-name'>Country</option>" + 
					"<option value='mixed'>Mixed</option>" + 
					"</select>";

				fragmentHTML += "</span>";

				// Option for specifying the order of day and month
				fragmentHTML += "<span class='colOptions postcode'>" +
				"<input type='checkbox' class='postcode' value='postcode' />" +
				"<span>Contains postcode</span>" +
				"</span>";

				/*
				 * Add a specific CSS class to the list of columns so CSS styles can 
				 * be applied.
				 */
				columnList.addClass("address-fragments");
				break;
			case "geolocationColumns" :

				fragmentHTML = "<span class='colOptions'>";

				fragmentHTML += 
					"<select class='geolocation-select'>" + 
					"<option value='lat'>Latitude</option>" + 
					"<option value='long'>Longitude</option>" +
					"<option value='northing'>Northing</option>" + 
					"<option value='easting'>Easting</option>" + 
					"</select>";	

				fragmentHTML += "</span>";
				/*
				 * Add the "fragments" class to the list of columns so CSS styles can 
				 * be applied.
				 */
				columnList.addClass("fragments");
				break;
			default :
				break;
			}

			return fragmentHTML;

		},

		/*
		 * showUndoButton
		 * 
		 * After a wizard has finish operating, we offer an "Undo" button for the user 
		 * to rollback their actions.
		 */
		showUndoButton : function(wizardBody) {
			$(wizardBody).parent().find("div.action-buttons a.undo").css("display","inline-block");
		},
		

		/*
		 * restoreWizardBody
		 * 
		 * Restores a wizards hidden elements after they have been hidden
		 * during the display of the "results" panel after typing a column 
		 * incorrectly.
		 */
		restoreWizardBody : function(){
			
			//log("restoreWizardBody");
			
			$("div.unexpectedValues").remove();
			$("div.wizard-panel").css("bottom","72px");
			$("div.wizard-body").children().show();
			$("div.wizard-body").find("span.note").hide();
			$("div.wizard-body").find("div.split").hide();
			$("div.action-buttons").show();
			return false;
		},

		/*
		 * undoWizardOperations
		 * 
		 * Rolls back the undo history to the specified history ID.
		 */
		undoWizardOperations : function(historyID){

			//log("undoWizardOperations");
			
			Refine.postCoreProcess(
					"undo-redo",
					{ lastDoneID: historyID },
					null,
					{ everythingChanged: true }
			);
		},


		/*
		 * THIS ISN'T BEING USED DUE TO COMPLICATIONS WITH 
		 * EDITING THE UNDO-REDO HISTORY IN THE FRONT END.
		 * 
		 * summariseWizardHistoryEntry
		 */
		summariseWizardHistoryEntry : function(wizardName, wizardHistoryRestoreID){

			/*
			 * Find the history entries between the restore point and 
			 * the "now" entry, remove them all but the first entry and 
			 * rename it to the name of the wizard.
			 */
			var removeEntry = false;
			for(var i=0; i<ui.historyPanel._data.past.length;i++){
				if(removeEntry){
					log("Removing --- "+ui.historyPanel._data.past[i].description);
					ui.historyPanel._data.past.splice(i,1);
					i--;
				}
				if(ui.historyPanel._data.past[i].id == wizardHistoryRestoreID){
					removeEntry = true;
					i++;
					ui.historyPanel._data.past[i].description = wizardName;
				}

			}

			ui.historyPanel._render();

		},
		
		/*
		 * resetWizard
		 * 
		 * Called once a wizard is complete.
		 * 
		 * Takes a wizard's body HTML element as a parameter and resets it's options
		 * and settings.
		 */
		resetWizard : function(wizardBody) {

			//log("resetWizard");
			
			// Clear checkboxes
			$(wizardBody).find(":input").removeAttr('checked').removeAttr('selected');
			// Clear column selections
			$(wizardBody).find("ul.selected-columns").html("").hide();
			// Clear text fields
			$(wizardBody).find(":text").val("");

			// Make sure the wizard is displayed so the user can repeat the
			// task if they wish
			// TODO: Don't need these any more
			$("a.wizard-header").removeClass("exp");
			$(wizardBody).prev("a.wizard-header").addClass("exp");
			$("div.wizard-body").hide();
			$(wizardBody).show();

			// Display the typing panel
			ui.leftPanelTabs.tabs({
				selected : 1
			});

			return false;

		},

		/*
		 * checkForUnexpectedValues
		 * 
		 * Called at the end of a wizard's operations - it takes an array of "colObjects" 
		 * (which have just been populated with the variables needed to check for any 
		 * unexpected values.
		 * 
		 * Takes an array of objects (colObjects) each containing an "unexpectedValueParams" 
		 * object - which contains an expression, an expected value and an expected type 
		 * to test the column with.
		 */
		checkForUnexpectedValues : function(colObjects, wizardBody){

			// log("checkForUnexpectedValues");

			var self = this;
			
			/*
			 * Run the tests on the columns using the colObjects, storing their result back inside
			 * their "unexpectedValueParams" object.
			 */
			for(var i=0; i<colObjects.length; i++){

				/*
				 * Check the column object has the unexepctedValueParams object which 
				 * contains the variables to test on.
				 */
				if(typeof colObjects[i].unexpectedValueParams != 'undefined'){

					// Set a flag for detecting unmatched values
					var unexpectedValuesPresent = false;

					// Create an "unexpectedValues" "result" object for the column by passing a 
					// number of variables to the verifyValueTypes function that creates facets 
					// and performs calculations.
					colObjects[i].unexpectedValueParams.result = self.verifyValueTypes(
							colObjects[i].unexpectedValueParams.colName,
							colObjects[i].unexpectedValueParams.expression,
							colObjects[i].unexpectedValueParams.expectedType,
							colObjects[i].unexpectedValueParams.exampleValue
					);

					// If the column's result object states the test was not a success, 
					// set the flag that causes the unexpected values panel to be displayed
					if(!colObjects[i].unexpectedValueParams.result.success){
						unexpectedValuesPresent = true;
					}
					
					// Once we've finished looping through the colObjects
					if(i == colObjects.length-1){
						
						// Decide to show the unexpected values UI or not depending 
						// on whether there are unexpected values in any of the columns.
						if(unexpectedValuesPresent){
							
							// Unexpected values present - display the panel
							// and pass the colObjects array, starting at index "0" (as it's a recursive 
							// function) and the wizard's body
							self.displayUnexpectedValuesPanel(colObjects, 0, wizardBody);
							
						} else {
							
							// No unexpected values present - do not display the panel
							self.restoreWizardBody();
							
							// Remove any facets left over from the tests
							for(var j=0; j<colObjects.length; j++){
								LG.ops.removeFacet(colObjects[j].name);
							}
						}
					}
				}
			}

		},

		/*
		 * verifyValueTypes
		 * 
		 * Uses a facet to calculate whether at least 90%
		 * of the columns values are what they are expected to be.
		 * 
		 * Returns a result object containing:
		 * 
		 * - averageType
		 * - count
		 * - message
		 * - success
		 */
		verifyValueTypes : function(columnName, expression, expectedType, exampleValue){

			// A value to decide whether a column has been successfully typed
			var percentage = 0.9;
			// The most frequently occurring type in the column (e.g. int, float, date, postcode)
			var averageType = "";
			// How many times the most frequently occurring type occurs.
			var averageTypeCount = 0;
			// How many values have been counted as unexpected
			var errorCount = 0;

			// Build the facet parameter object
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : columnName,
						"columnName" : columnName,
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

			// Compute the facet and retrieve the counts of the values asked for 
			// by our expression
			$.ajax({
				async : false,
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams),
					project : theProject.id
				},
				success : function(data) {
					 // Loop through the UI facets
					 for (var i=0; i<data.facets.length; i++) {
						// If the facet matches the column name and has choices returned
						if (data.facets[i].columnName == columnName && typeof data.facets[i].choices != 'undefined') {
							// Loop through the returned facet choices, find out which 
							// choice (== value) is the average type, how many times it occurs,
							// how many unexpected values occur.
							var choices = data.facets[i].choices;
							for(var j=0; j<choices.length; j++){
								// Find the highest occurring choice.
								if(choices[j].c >= averageTypeCount){
									averageType = choices[j].v.l;
									averageTypeCount = choices[j].c;							
								}
								// Store the number of unexpected values (the testing expression provided 
								// by each wizard produces the value "error" if the value is unexpected
								if(data.facets[i].choices[j].v.l == "error"){
									errorCount = choices[j].c;
								}
							}

							// Break out of the facet loop
							i=data.facets.length;
						}
					}
				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

			// Construct a result object containing the returned
			// counts from the test
			var result = {
					colName:columnName,
					exampleValue:exampleValue,
					averageType:averageType,
					count:averageTypeCount,
					expression:expression,
					errorCount:errorCount
			};

			
			// Populate the result objects further by performing calculations to 
			// create some semantics from results (i.e. has the column been successfully typed?, 
			// what the situation is - is it a severe or minor fail...)
			
			if(averageTypeCount == theProject.rowModel.total && expectedType == averageType){
				// If the averageType resembles 90% or more of the total 
				// number of types, then we can say the column has been typed successfully
				result.message = "All values in the <span class='colName'>"+result.colName+"</span> column successfully typed as <span class='valueType'>"+averageType+"</span>.";
				result.success = true;
				result.type = "success";
			} else if(errorCount == 0){
				// If 0 errors (unexpected values) have been detected, the column has been successfully typed.
				result.message = "All values in the <span class='colName'>"+result.colName+"</span> column successfully typed as <span class='valueType'>"+averageType+"</span>.";
				result.success = true;
				result.type = "success";		
			} else if(averageTypeCount == theProject.rowModel.total && expectedType !== averageType) {
				// If every value is the same type, but it wasn't what was expected
				result.message = "None of values in the <span class='colName'>"+result.colName+"</span> column could by typed properly - despite every value being the same type. Is this the correct column for this wizard?";
				result.success = false;
				result.type = "fail";		
			} else if(averageTypeCount >= (theProject.rowModel.total*percentage) && expectedType == averageType){
				// If the average type occurs 90% or more of the time and it is what we were expecting as a type
				// Despite this being a good score - we still ask the user to correct the few values that are unexpected, 
				// and in order to do that, we need to set the result.success flag to false.
				result.message = "At least "+percentage*100+"% of the <span class='colName'>"+result.colName+"</span> column's values are of the expected type <span class='valueType'>"+averageType+"</span>.";
				result.success = false;
				result.type = "warning";
			} else if(expectedType == averageType){
				// If the average type in the column is what we were expecting, but hasn't occurred 
				// as much as we'd hoped
				result.message = "The <span class='colName'>"+result.colName+"</span> column contains values that were expected, but there are some unexpected values too.";
				result.success = false;
				result.type = "warning";
			} else if(averageTypeCount >= (theProject.rowModel.total*percentage)){
				// If the column contains an average type that occurs over 90% of the time, but isn't 
				// what we expected.
				result.message = "The <span class='colName'>"+result.colName+"</span> column mostly contains values of the type <span class='valueType'>"+averageType+"</span> - which was not expected.";
				result.success = false;	
				result.type = "warning";
			} else {
				// A unicorn is trapped in the column header
				result.message = "There's no clear value type in the <span class='colName'>"+result.colName+"</span> column - but the most frequently occurring is <span class='valueType'>"+averageType+"</span>.";
				result.success = false;	
				result.type = "notclear";
			}

			//log(result);

			return result;
		},

		/*
		 * displayUnexpectedValuesPanel
		 * 
		 * After a user has completed a wizard and we have detected
		 * that there are a certain number of unexpected values, we recursively 
		 * loop through the wizard's "colObjects", and check 
		 * 
		 * It offers the user the choice of fixing or ignoring any errors
		 * that may have been produced by incorrectly typing a column.
		 * 
		 * Recursion is used to chain the completion of each test
		 * 
		 * TODO: This needs to be split up.
		 */
		displayUnexpectedValuesPanel : function(colObjects, index, wizardBody){

			var self = this;
			
			// Hide the Back button - the user needs to pick the buttons 
			// offered to them in the unexpected values panel instead
			self.els.returnButton.hide();
			
			// Set a boolean for whether the user has fixed a value or not.
			// This will determine which panels to show
			self.hasFixedValue = false;

			// Remove the "complete" message
			$(wizardBody).find('div.unexpectedValues').remove();

			// Base case - if the index is still valid when looping through 
			// the colObjects array
			if(index < colObjects.length) {

				if(typeof colObjects[index].unexpectedValueParams != 'undefined' 
					&& !colObjects[index].unexpectedValueParams.result.success){

					// log("Building unexpected values panel...");
					
					// TODO: Put the following code into a "buildUnexpectedValues" panel
					// function.
					
					// Store a few variables for easier reading					
					var result = colObjects[index].unexpectedValueParams.result;
					var unexpectedValues = result.errorCount;
					var percentage = Math.round(((unexpectedValues/theProject.rowModel.total)*100)*Math.pow(10,2))/Math.pow(10,2);
					// The maximum number of unexpected values we ask the user to attempt to correct.
					// TODO: Not sure that this is being used (the 90% mark seems to be the only marker)
					var correctionLimit = 15;
					
					// Begin constructing the HTML for the unexpected values panel
					var html = '<div class="warning"><p class="title">Unexpected values</p>';

					// Depending on the result situation, display different HTML
					if(result.count == theProject.rowModel.total && !result.success){
						html+= '<p class="message">None of the values in the <span class="colName">'+result.colName+'</span> column could be typed properly!</p>';
						html+= '<p class="details">Are you sure you picked the right column?</p>';		
					} else if((theProject.rowModel.total - result.errorCount) <= correctionLimit){
						html+= '<p class="message"><span class="count">'+result.errorCount+'</span> unexpected value'+(unexpectedValues == 1 ? ' has ' : 's have ')+'been detected in the column <span class="colName">'+result.colName+'</span>.</p>';
						html+= '<p class="details">Can you fix '+(unexpectedValues == 1 ? 'it' : 'them')+'?</p>';
					} else {
						html+= '<p class="message">Around '+percentage+'% of the values ('+unexpectedValues+') in the <span class="colName">'+result.colName+'</span> column have been deteceted as unexpected values.'
						html+= '<p class="details">Are you sure you have selected the correct column?</p>';
					}

					// Give the user an example value to look at when correcting the values.
					html+= '<p class="message exampleValue">Example value: <span>'+result.exampleValue+'</span></p>';
					// Append buttons allowing the user to undo the wizard, to ignore the unexpected values
					// and to fix the values depending on whether the the test was a fail or not.
					html+= '<div class="buttons">';
					html+= '<a title="Undo" class="button undo" bind="undoButton" href="javascript:{}">Undo</a>';
					if(!(result.count == theProject.rowModel.total && !result.success)){
						html+= '<a title="Let me see" class="button fix" bind="fixButton" href="javascript:{}">Let me see</a>';
					}
					html+= '<a title="Carry on" class="button carryon" bind="carryOnButton" href="javascript:{}">Carry on</a>';
					
					html+= '</div>';
					html += '</div>';

					// Create the unexpectedValues panel
					$(wizardBody).append('<div class="unexpectedValues" />');
					// Inject the HTML we've just constructed
					$(wizardBody).find("div.unexpectedValues").html(html);
					// The default actions buttons aren't needed.	
					$("div.action-buttons").hide();
					// Hide everything in the wizard (column selectors, text, selected columns etc) 
					// except for the header and the unexpected values panel
					$("div.wizard-body").children().hide().end().find("h2, div.unexpectedValues").show();
					
					// TODO: This could be in a function called "setupUnexpectedValuesPanel"
					// Set up interaction for the action buttons local to the unexpected values panel
					var unexpectedValuesEl = $("div.unexpectedValues");
					// For each button inside the panel element
					unexpectedValuesEl.find("a.button").click(function(){

						if($(this).hasClass("undo")){
							// For the Undo button
							// Reset the hasFixedValue boolean
							self.hasFixedValue = false;
							// Simulate a click on the wizards hidden Undo button (this rollsback
							// the wizard)
							$("div.action-buttons a.undo").click();
							// Return the wizard to it's original state
							self.restoreWizardBody();
						} else if($(this).hasClass("fix")){
							// For the "Let me see" button
							// Create a facet and filter the rows in the table so 
							// only the rows with unexpected values in are visible
							// TODO: Make this clear that's what's happened in the UI panel
							// TODO: Disable access to the table at this point. We want the user
							// to only be editing values in the panel
							self.showUnexpectedValues(result,function(result){
								// Perform an update in Refine
								Refine.update({modelsChanged:true},function(){
									// Create and populate list of input boxes that contain
									// the unexpected values
									self.populateUnexpectedValuePanelList(result);
								});
							});
	
							// Hide certain HTML elements once the "Let me see" button has 
							// been clicked
							unexpectedValuesEl.find("p.details").hide();
							unexpectedValuesEl.find("div.buttons").find("a.button").hide();
							// Show two new buttons - "Rerun wizard" and "Done".
							unexpectedValuesEl.find("div.buttons").append("<a class='button rerun' />");
							unexpectedValuesEl.find("div.buttons").append("<a class='button done' />");
							unexpectedValuesEl.find("div.buttons").find("a.rerun").html("Re-run wizard").show();
							unexpectedValuesEl.find("div.buttons").find("a.done").html("Done").show();

							// Use the hasFixedValue boolean flag to determine whether to show a message to the user
							// telling them that if they have corrected all the values possible to correct, 
							// there won't be any rows left in the table (or input boxes left for them to edit).
							if(self.hasFixedValue){
								unexpectedValuesEl.find("div.buttons")
								.before('<p class="message rerun-tip">If you have corrected all of the values properly, there should be no more rows left for you to edit.</p>');
							}
							
							// Interaction for the "Rerun wizard" button
							unexpectedValuesEl.find("div.buttons").find("a.rerun").click(function(){
								
								// Transform the cells using the values the user has typed into the input boxes 
								// in the unexepected values panel
								self.fixUnexpectedValues(result, function(){
									// Set the hasFixedValue boolean
									self.hasFixedValue = true;
									// Perform an update to reflect the changes in the data table
									Refine.update({cellsChanged:true}, function(){
										/*
										 * Re-run the current wizard using it's last configuration
										 * 
										 * This is the equivalent of saying
										 * LG.wizards.**wizardName**.rerunWizard(), but uses the current wizard
										 * HTML panel to extract the name.
										 */
										LG.wizards[wizardBody.attr('rel')].rerunWizard();						
									});
								});
							});

							// Interaction for the "Done" button
							unexpectedValuesEl.find("div.buttons").find("a.done").click(function(){

								// Reset the hasFixedValue boolean
								self.hasFixedValue = false;

								// Remove the "error" facet
								// This removes the filter from the data table - so all the 
								// rows are now showing.
								var facets = ui.browsingEngine._facets;
								for(var i=0; i < facets.length; i++){
									if(facets[i].facet._config.columnName == result.colName){
										facets[i].facet._remove();
									}
								}
								
								// Return the wizard to it's original state
								self.restoreWizardBody();

							});

						} else if($(this).hasClass("carryon")){
							// For the "Carry On" button
							// When the user clicks "Carry on" we recurse into this function
							// but we move on to the next colObject.
							
							// Reset the hasFixedValue flag
							self.hasFixedValue = false;
							
							// If we've looped through all of the colObjects
							if(index == colObjects.length-1){
								
								// Remove the "error" facet / return the rows in the data table to normal
								var facets = ui.browsingEngine._facets;
								for(var i=0; i < facets.length; i++){
									if(facets[i].facet._config.columnName == result.colName){
										facets[i].facet._remove();
									}
								}

								// Return the wizard to it's original state
								self.restoreWizardBody();
								
							} else {
								// If the user has pressed "Carry on", but there are other 
								// columns to possibly correct values for

								// Remove the "error" facet
								var facets = ui.browsingEngine._facets;
								for(var i=0; i < facets.length; i++){
									if(facets[i].facet._config.columnName == result.colName){
										facets[i].facet._remove();
									}
								}

								// Move on to the next colObject by incrementing the index.
								index = index+1;
								// Recurse until we've processed each colObject.
								self.displayUnexpectedValuesPanel(colObjects, index, wizardBody);
							}
						}
					});

				} else {
					// If the colObject does not contain any "unexpected value" data (i.e. the 
					// parameters and the result
					
					// Remove the "error" facet
					var facets = ui.browsingEngine._facets;
					for(var i=0; i < facets.length; i++){
						if(facets[i].facet._config.columnName == colObjects[index].name){
							facets[i].facet._remove();
						}
					}

					// Move on to the next colObject by recursing
					index = index+1;
					self.displayUnexpectedValuesPanel(colObjects, index, wizardBody);
				}
			} else {
				// We have looped through the colObjects
			}

		},
		

		/*
		 * showUnexpectedValues
		 * 
		 * Filters the rows in the table using the expression provided by the wizard 
		 * for the unexpected values test.
		 * 
		 * This is like simulating a custom text facet on the data.
		 */
		showUnexpectedValues : function(result, callback){

			var facets = ui.browsingEngine._facets;

			// Remove any existing facets for the column in question
			for(var i=0; i < facets.length; i++){
				if(facets[i].facet._config.columnName == result.colName){
					facets[i].facet._remove();
				}
			}

			// Add a facet using the required expressions
			// Note: This is different to the "compute-facets" call we often use.
			// We can't avoid not creating a visible facet in order to filter the rows 
			// in the table
			ui.browsingEngine.addFacet("list",{
				"name": result.colName,
				"columnName": result.colName,
				"expression": result.expression
			});

			// Find the facet we've just added
			for(var i=0; i<facets.length; i++){
				if(facets[i].facet._config.columnName == result.colName){
					var colFacet = facets[i].facet;
					// Select the "error" choice
					colFacet._selection.push({
						"v":{
							"v":"error",
							"l":"error"
						}
					});
				}
			}

			// Make sure the Typing panel is showing instead of the Facet/Filter panel
			$("div#left-panel div.refine-tabs").tabs('select', 1);

			callback(result);

		},
		

		/*
		 * populateUnexpectedValuePanelList 
		 * 
		 * Instead of using a faceted list of values, we can take advantage of 
		 * the fact the unexpected values feature filters the rows in the data table, 
		 * so we can simply pluck the values from the table element.
		 * TODO: Perhaps not the best approach, but the data table will always show the 
		 * values to be fixed.
		 */
		populateUnexpectedValuePanelList : function(result){

			var html = '<ul class="unexpectedValueList">';

			var columns = theProject.columnModel.columns;
			for(var i=0;i<columns.length;i++){
				if(columns[i].name == result.colName){
					for(var j=0;j<theProject.rowModel.rows.length;j++){
						if(theProject.rowModel.rows[j].cells[columns[i].cellIndex] != null){
							// The input element needs to contain the cell index and row index 
							// which we pass to the "edit-one-cell" process call in the "fixUnexpectedValues()" 
							// function.
							html += '<li><input class="unexpectedValue" type="text" data-cell="'+
							columns[i].cellIndex+'" data-row="'+theProject.rowModel.rows[j].i+'" rel="'+
							theProject.rowModel.rows[j].cells[columns[i].cellIndex].v+'" value="'+
							theProject.rowModel.rows[j].cells[columns[i].cellIndex].v+'" /></li>';
						}
					}
				}
			}

			html += "</ul>";

			$("div.unexpectedValues").find("div.buttons").before(html);
		},

		/*
		 * fixUnexpectedValues
		 * 
		 * Applies the edited values from inside the unexpectedValues panel to the actual data.
		 */
		fixUnexpectedValues : function(result, callback){

			// Loop through each of the list elements that contain the input boxes
			$("div.unexpectedValues").find("ul.unexpectedValueList").children("li").each(function(){

				var li = $(this);

				// Construct a parameter object
				var data = {
						cell : $(li).children("input").attr("data-cell"),
						row : $(li).children("input").attr("data-row"),
						value : $(li).children("input").val(),
						engine : JSON.stringify(ui.browsingEngine.getJSON())
				};

				// Call a SINGULAR edit process as opposed to a MULTI edit process.
				// Though it may seem backward, we don't want to overwrite multiple cells as they 
				// may not represent the same thing.
				// TODO: We should provide an option here to say - "Apply to all identical cells?"
				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "edit-one-cell",
					data : data,
					success : function(data) {
						//
					}
				});

				// Test whether we have iterated to the end of the list, in which 
				// case, callback
				if(li[0] == $("div.unexpectedValues").find("ul.unexpectedValueList").children("li").eq($("div.unexpectedValues").find("ul.unexpectedValueList").children("li").length-1)[0]){
					callback();
				}
			});
		}

};