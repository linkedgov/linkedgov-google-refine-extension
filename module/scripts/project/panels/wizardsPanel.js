/*
 * wizardsPanel.js
 * 
 * 
 */
var LinkedGov_WizardsPanel = {


		initialise:function(){

			var self = this;

			self.body = LG.panels.typingPanel._el.wizardsPanel;
			self.actionBar = LG.panels.typingPanel._el.actionBar;

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
			self.actionBar.find('a.collapse-expand').live("click",function() {
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
			ui.typingPanel._el.returnButton.click(function(){
				ui.typingPanel.destroyColumnSelector();
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
			self.actionBar.find("div.action-buttons").find("a.update").live("click",function(){

				ui.typingPanel.destroyColumnSelector();

				var wizardObject = LG.wizards[$(this).parent().attr("rel")];
				wizardObject.initialise(DOM.bind(self.body));
				log("here");
			});

			self.actionBar.find("div.action-buttons").find("a.undo").live("click",function(){

				LG.panels.typingPanel.destroyColumnSelector();
				var wizardObject = LG.wizards[$(this).parent().attr("rel")];

				/*
				 * Undo the operations executed by the wizard for the most recent 
				 * wizard completion.
				 */
				LG.undoWizardOperations(wizardObject.vars.historyRestoreID);

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
			$("div.selector a.selectColumn").live("click",function () {

				if($(this).hasClass("splitter")){
					ui.typingPanel.buttonSelector($(this),"splitter");			
				} else if($(this).hasClass("single-column")){ 
					ui.typingPanel.buttonSelector($(this),"single-column");
				} else if($(this).hasClass("text-input")){ 
					ui.typingPanel.buttonSelector($(this),"text-input");			
				} else {
					ui.typingPanel.buttonSelector($(this),"default");			
				}
			});

			/*
			 * 'Remove column' interaction for column lists
			 */
			$("ul.selected-columns li span.remove").live("click",function(){
				ui.typingPanel.removeColumn($(this));
			});

			/*
			 * Preview widget for wizards
			 */
			$("div.preview a.button").live("click",function(){
				ui.typingPanel.generateWizardPreview($(this));
			});

			/*
			 * Show and position tooltips
			 */
			$("a.info").live("mouseover",function () {
				$(this).next("span").css("top",($(this).offset().top-($(this).next("span").height()/2))+"px").show();
			}).live("mouseout",function () {
				$(this).next("span").hide();
			});

			/*
			 * Set up more user interaction but slightly more specific to each wizard.
			 */
			self.setupWizardInteraction();

		},

		show: function(){

			/*
			 * Hide the other panels
			 */
			LG.panels.typingPanel.hidePanels();

			/*
			 * Show this panel
			 */
			this.body.show();

			/*
			 * Make sure the panel's showing the right thing
			 */
			this.showQuestions();
		},

		/*
		 * Shows the wizard questions
		 */
		showQuestions:function(){
			// Hide all wizards
			this.body.find("div.wizard-bodies").hide();
			// Show the questions
			this.body.find("div.questions").show();
			// Show the collapse-expand button
			this.actionBar.find("a.collapse-expand").show();
			// Hide the action buttons
			this.actionBar.find("div.action-buttons").hide();
			// Hide the "return to wizards" button
			this.actionBar.find("div.return-button").hide();
			// Show the finish button
			this.actionBar.find("div.finish-button").show();

		},

		/*
		 * Displays a specific wizard
		 */
		showWizard:function(wizardName){
			
			var self = this;
			
			// Hide the wizard questions
			this.body.find("div.questions").hide();
			// Hide all wizards
			this.body.find("div.wizard-body").hide();
			// Make sure the wizard panel can be seen
			this.body.find("div.wizard-bodies").show();
			// Show the chosen wizard
			this.body.find("div.wizard-body[rel='"+wizardName+"']").show();
			// Hide the question collapse button
			this.actionBar.find("a.collapse-expand").hide();
			// Show the "return to wizards" button
			this.actionBar.find("div.return-button").show();
			// Update the div.action-buttons rel attribute to relate to the specific wizard
			this.actionBar.find("div.action-buttons").attr("rel",wizardName);
			// Show the action buttons
			this.actionBar.find("div.action-buttons").show();			
			// Hide the finish button
			this.actionBar.find("div.finish-button").hide();
			
			//LG.panels.typingPanel._el.actionBar.find("div.action-buttons").find("a.update").attr("bind",$("div.wizard-body").find("a.update").attr("bind"));

			switch(wizardName){

			case "measurementsWizard" : 

				log($("#unitInputField"));
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
				ui.typingPanel.populateRangeSelector($("div.rangeSelect").find("div.selector").children("div.range"), function(){
					$("div.rangeSelect").find("div.selector").children("div.range").slideDown();					
				});

				break;
				
			default:
				break;

			}


		},

		/*
		 * Sets up more specific user interaction for wizards.
		 */
		setupWizardInteraction : function() {

			/*
			 * Interaction for the column range select inputs
			 */
			$("div.selector div.range select").live("change",function () {
				ui.typingPanel.rangeSelector($(this));
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
					LG.splitVariablePartColumn.initialise(name, separator, splitElement, function(){
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
		 * loadWizardScripts
		 */
		loadWizardScripts : function(){

			$.getScript("extension/linkedgov/scripts/project/wizards/addressWizard.js",function(){
				LG.wizards.addressWizard = LinkedGov_addressWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/dateTimeWizard.js",function(){
				LG.wizards.dateTimeWizard = LinkedGov_dateTimeWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/geolocationWizard.js",function(){
				LG.wizards.geolocationWizard = LinkedGov_geolocationWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/measurementsWizard.js",function(){
				LG.wizards.measurementsWizard = LinkedGov_measurementsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/columnsToRowsWizard.js",function(){
				LG.wizards.columnsToRowsWizard = LinkedGov_columnsToRowsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/rowsToColumnsWizard.js",function(){
				LG.wizards.rowsToColumnsWizard = LinkedGov_rowsToColumnsWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/nullValueWizard.js",function(){
				LG.wizards.nullValueWizard = LinkedGov_nullValueWizard;
			});
			$.getScript("extension/linkedgov/scripts/project/wizards/enumerationWizard.js",function(){
				LG.wizards.enumerationWizard = LinkedGov_enumerationWizard;
			});

		},

		/*
		 * loadHTML
		 */
		loadHTML : function(){

			/*
			 * Load the wizard questions
			 */
			$("div#wizards-panel").html(DOM.loadHTML("linkedgov", "html/project/panels/wizardsPanel.html")+$("div#wizards-panel").html());

			/* 
			 * Load each wizards' HTML into the wizard-bodies element.
			 */
			var wizardBodiesEl = $("div#wizards-panel").find("div.wizard-bodies");

			var interval = setInterval(function(){
				if(typeof LG.wizards != 'undefined'){
					$.each(LG.wizards,function(key,value){	

						var html = DOM.loadHTML("linkedgov", "html/project/wizards/"+key+".html");
						/*
						 * Store the HTML element inside the actual wizard object as it's body
						 */
						LG.wizards[key].vars.body = $("div.wizard-body[rel='"+key+"']");
						wizardBodiesEl.html(wizardBodiesEl.html()+html);

					});
					clearInterval(interval);
				} else {
					log("LG.wizards hasn't been created yet");
				}
			},100);

		},

};