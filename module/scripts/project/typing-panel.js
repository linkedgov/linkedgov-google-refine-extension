/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The "Typing" panel object
 * 
 * Follows the same structure as the facet and history
 * panels.
 * 
 * Contents:
 * - Resize function
 * - Update function
 * - Render function
 * - Interaction handler for the wizards
 * - Interaction for column selection
 * 
 */

/*
 * Constructor for the typing panel
 */
function TypingPanel(div) {
	this._div = div;
	this.update();
}

/*
 * Resize function - similar to the other panels
 * 
 * TODO: Perhaps use CSS instead of a resize function?
 */
TypingPanel.prototype.resize = function () {
	var body = this._div.find(".typing-panel-body");

	var bodyPaddings = body.outerHeight(true) - body.height();
	body.height((this._div.height() - bodyPaddings) + "px");
	body[0].scrollTop = body[0].offsetHeight;
};

/*
 * Update function
 */
TypingPanel.prototype.update = function (onDone) {
	var self = this;
	self._render();
};

/*
 * _render
 * 
 * - Initialises the autosuggestion box for the measurements wizard
 * - Attachers listeners to the wizard "Update" buttons
 * - Resizes the panel
 */
TypingPanel.prototype._render = function () {

	var self = this;

	var elmts = DOM.bind(self._div);

	/*
	 * When each wizards' "Update" button is clicked, 
	 * their corresponding wizard function is called. Each of the 
	 * wizards have "bind" attributes in their HTML code, which 
	 * allows access to the individual elements through the object
	 * "elmts".
	 */

	$("a[bind='dateTimeButton']").live("click",function () {
		self.destroyColumnSelector();
		LinkedGov.dateTimeWizard.initialise(DOM.bind(self._div));
	});

	$("a[bind='measurementsButton']").live("click",function () {
		self.destroyColumnSelector();
		LinkedGov.measurementsWizard.initialise(DOM.bind(self._div));
	});

	$("a[bind='latLongButton']").live("click",function(){
		self.destroyColumnSelector();
		LinkedGov.latLongWizard.initialise(DOM.bind(self._div));	 
	});

	$("a[bind='addressButton']").live("click",function () {
		self.destroyColumnSelector();
		LinkedGov.addressWizard.initialise(DOM.bind(self._div));
	});

	$("a[bind='multipleColumnsButton']").live("click",function () {
		self.destroyColumnSelector();
		LinkedGov.multipleColumnsWizard.initialise(DOM.bind(self._div));
	});

	$("a[bind='multipleValuesButton']").live("click",function () {
		self.destroyColumnSelector();
		LinkedGov.multipleValuesWizard.initialise(DOM.bind(self._div));
	});

	/*
	 * Called similarly to Refine's panels.
	 */
	this.resize();
};


TypingPanel.prototype.enterWizard = function(wizardName) {

	$("div.wizard-panel").html(DOM.loadHTML("linkedgov", "html/project/"+wizardName+".html",function(){		
		$("div.typing-panel-body").animate({"left":"-300px"},500);
		$("div.cancel-button").animate({"left":"0px"},500);
		$("div.wizard-panel").animate({"left":"0px"},500,function(){
			
			$("div.update-button").show();
			
			// show the info icon
			$("a.info").show();

			//Wire the sticky update button to the wizards specific update button
			$("div.update-button a.button").attr("bind",$("div.wizard-body").find("a.update").attr("bind"));

			/*
			 * Perform some JS initialisation specific to the wizard
			 */
			switch(wizardName){

			case "measurement-wizard" : 

				// make the measurements text field auto suggest
				$("#unitInputField").suggest().bind("fb-select", function (e, data) {
					//alert(data.name + ", " + data.id);
				});

				break;

			case "rangecolumns-wizard" :

				/*
				 * If the wizard contains a range selector, retrieve the 
				 * column header names and populate the select inputs.
				 */
				$("div.rangeSelect").find("div.selector").children("div.range").hide();
				ui.typingPanel.populateRangeSelector(function(){
					$("div.rangeSelect").find("div.selector").children("div.range").slideDown();					
				});

				break;
			case "datetime-wizard" :
				//$("div.wizard-body span.mb4d").css();
				break;
			default:
				break;

			}

		});
	}));	

}

TypingPanel.prototype.exitWizard = function() {

	$("div.update-button").animate({"left":"300px"},500,function(){
		$(this).hide();
	});
	$("div.typing-panel-body").animate({"left":"0px"},500);
	$("div.cancel-button").animate({"left":"300px"},500);
	$("div.wizard-panel").animate({"left":"300px"},500, function(){
		$("div.wizard-panel").find("div.wizard-body").remove();
	});
}


TypingPanel.prototype.populateRangeSelector = function(callback) {

	callback = callback || function(){return false};

	var columnHeaders = "";
	var i = 0;
	/*
	 * Grab the column names from the data table and present 
	 * them as <option> elements.
	 * TODO: Perhaps grab the names from Refine's DOM object 
	 * instead.
	 */
	$("div.column-header-title span.column-header-name").each(function () {
		if ($(this).html() != "All") {
			columnHeaders += "<option data-id='" + i + "' value='" + $(this).html() + "'>" + $(this).html() + "</option>";
			i++;
		}
	});
	/*
	 * Populate the select inputs with the <option> elements.
	 */
	$("div.rangeSelect").find("div.selector").children("div.range").children("select").each(function () {
		$(this).html(columnHeaders);
		$(this).val($(this).find("option").eq(0).val());
	});

	callback();

}

/*
 * columnSelector
 * 
 * Upon clicking the "Select" button in each wizard to select columns, 
 * the jQuery UI "selectable" plugin is invoked and the callbacks for 
 * for the selection actions populate a list in the wizard.
 * 
 */
TypingPanel.prototype.buttonSelector = function(button, selectType) {

	var self = this;
	var mode = selectType || "default";

	if ($(button).html() == "Start Select") {

		self.destroyColumnSelector();

		$cols = $(button).parent().children("ul.selected-columns");
		//$cols.html("").hide();
		$(button).html("End Select");

		var RefineUI = ui;

		$("table.data-header-table").selectable({
			filter: 'td.column-header',
			selected: function (event, ui) {
				if($(ui.selected).children().find(".column-header-name").html() != "All"){
					var addToList = true;
					$cols.children("li").children("span.col").each(function(){
						/*
						 * Check if column has already been selected.
						 */
						if($(this).html() == $(ui.selected).children().find(".column-header-name").html()){

							$(this).parent("li").remove();
							$(ui.selected).removeClass("ui-selected");

							if($cols.children("li").length < 1){
								$cols.html("").hide();
							} else {
								$cols.show();
							}

							if($(this).parent().hasClass("skip")){
								$(this).parent().removeClass("skip").show();
							}

							addToList = false;
						}
					});
					if(addToList){
						switch(mode){
						case "default" :
							$cols.append( 
									"<li>" +
									"<span class='col'>" + 
									$(ui.selected).children().find(".column-header-name").html() + 
									"</span>" + 
									"<span class='remove'>X</span>" +
									RefineUI.typingPanel.getFragmentData($cols) +
									"</li>"
							)
							.show();
							break;
						case "single-column" :
							$cols.html( 
									"<li>" +
									"<span class='col'>" + 
									$(ui.selected).children().find(".column-header-name").html() + 
									"</span>" + 
									"<span class='remove'>X</span>" +
									RefineUI.typingPanel.getFragmentData($cols) +
									"</li>"
							)
							.show();							
							break;
						case "splitter" :
							$cols.html(
									"<li>" +
									"<span class='col'>" + 
									$(ui.selected).children().find(".column-header-name").html() + 
									"</span>" + 
									"<span class='remove'>X</span>" +
							"</li>")
							.show();	
							break;
						}
					}
				}
			},
			unselected: function (event, ui) {
				$cols.children("li").children("span.col").each(function(){
					if($(this).html() == $(ui.unselected).children().find(".column-header-name").html()){
						$(this).parent("li").remove();
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
		self.destroyColumnSelector();
	}	
}



/*
 * rangeSelector
 * 
 * On the range selects' input change, rangeSelector is called.
 * 
 * It adds basic validation to the select inputs so that when 
 * a value is picked in the "From" range select, all values before 
 * that value in the "To" range select are disabled, and vice versa.
 */
TypingPanel.prototype.rangeSelector = function(select) {

	var self = this;
	self.destroyColumnSelector();

	$cols = $(select).parent().parent().children("ul.selected-columns");
	$cols.html("").hide();
	var colsHTML = "";
	var from = 0, to = 0;

	if ($(select).hasClass("from")) {
		// Limit the "to" select input
		// Check to see if the other input has been set and
		// adjust the column list
		from = parseInt($(select).find("option[value='" + $(select).val() + "']").attr("data-id"));
		$(select).parent().find("select.to").children("option").each(function() {
			if (parseInt($(this).attr("data-id")) <= from) {
				$(this).attr("disabled", "true");
			} else {
				$(this).removeAttr("disabled");
			}
		});
	} else if ($(select).hasClass("to")) {
		// Limit the first select input
		// Check to see if the other input has been set and
		// adjust the column list
		to = parseInt($(select).find("option[value='" + $(select).val() + "']").attr("data-id"));
		$(select).parent().find("select.from").children("option").each(function () {
			if (parseInt($(this).attr("data-id")) >= to) {
				$(this).attr("disabled", "true");
			} else {
				$(this).removeAttr("disabled");
			}
		});
	}

	$(select).find("option").each(function () {
		if (parseInt($(this).attr("data-id")) >= parseInt($(this).parent().parent().children("select.from").find("option[value='" + $(this).parent().parent().children("select.from").val() + "']").attr("data-id")) 
				&& parseInt($(this).attr("data-id")) <= parseInt($(this).parent().parent().children("select.to").find("option[value='" + $(this).parent().parent().children("select.to").val() + "']").attr("data-id"))) {
			/*
			 * Populate the wizards column display.
			 * <li><span>Column Name</span><select>Fragment data</select><span>Remove column</span></li>
			 */
			colsHTML += "<li>" +
			"<span class='col'>" + $(this).val() + "</span>" +  
			"<span class='remove'>X</span>" +
			ui.typingPanel.getFragmentData($cols) +
			"</li>";
			/*
			 * Add jQuery UI's "selected" styles to the column headers in the
			 * data table.
			 * 
			 * TODO: Inefficient iteration.
			 */
			$colName = $(this).val();
			$("table.data-header-table tr td.column-header span.column-header-name").each(function(){
				if($(this).html() == $colName){
					$(this).parent().parent("td").addClass("ui-selected");
					$("table.data-header-table").addClass("ui-selectable");
				}
			});
		}
	});

	if(colsHTML == ""){

	} else {
		$cols.html(colsHTML).show();
	}

}

/*
 * Destroys the jQuery UI 'selectable' object when a new wizard 
 * is started/finished.
 */
TypingPanel.prototype.destroyColumnSelector = function() {
	$("div.selector a.selectColumn").html("Start Select");
	$("table.data-header-table").selectable("destroy");
	$("table.data-header-table .column-header").each(function () {
		$(this).removeClass("ui-selected").removeClass("skip");
	});	
}

/*
 * removeColumn
 * 
 * Updates column selector when removing a column
 */
TypingPanel.prototype.removeColumn = function(el) {

	/*
	 * Slide up column, apply "skip" class which has display:none.
	 * Remove ui-selected from column header.
	 */

	/*
	 * Check to see if column being removed is the first or last 
	 * in column selection, in which case it is ok to remove from 
	 * the range.
	 */
	$cols = $(el).parent("li").parent("ul");

	if($(el).parent("li")[0] === $(el).parent().parent("ul").children().eq(0)[0] || $(el).parent("li")[0] == $(el).parent("li").parent("ul").children("li").eq($(el).parent("li").parent("ul").children("li").length-1)[0]){

		$(el).parent().slideUp(250,function(){

			$(this).remove();

			while($cols.children("li").length > 0 && $cols.children("li").eq(0).hasClass("skip")){
				$cols.children("li").eq(0).remove();
			}

			if($cols.children("li").length < 1){
				$cols.html("").hide();
			}
		});
		/*
		 * Remove the "selected" styling for the removed columns in the data table
		 */
		$li_el = $(el).parent("li");

		$("td.column-header div.column-header-title span.column-header-name").each(function(){
			if($(this).html() == $li_el.find("span.col").html()){
				$(this).parent().parent("td").removeClass("ui-selected");
			}
		});

	} else {
		/*
		 * If the column is within the range, add the class "skip" to 
		 * the <li> element to hook on to during the wizard.
		 */
		if($(el).parent("li").hasClass("skip")){
			$(el).parent().removeClass("skip");
			$li_el = $(el).parent("li");

			$("td.column-header div.column-header-title span.column-header-name").each(function(){
				if($(this).html() == $li_el.find("span.col").html()){
					$(this).parent().parent("td").addClass("ui-selectee ui-selected");
				}
			});
		} else {			
			$li_el = $(el).parent("li");

			$li_el.slideUp(250,function(){
				$(this).addClass("skip");
			});

			$("td.column-header div.column-header-title span.column-header-name").each(function(){
				if($(this).html() == $li_el.find("span.col").html()){
					$(this).parent().parent("td").removeClass("ui-selectee ui-selected");
				}
			});	
		}
	}

}

/*
 * getFragmentData
 * 
 * Returns the HTML for the select inputs for certain wizards 
 * if the user is required to map data fragments for columns.
 */
TypingPanel.prototype.getFragmentData = function(columnList) {

	var fragmentHTML = "";

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

		/*
		 * Add the "fragments" class to the list of columns so CSS styles can 
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
		 * Add the "fragments" class to the list of columns so CSS styles can 
		 * be applied.
		 */
		columnList.addClass("address-checkboxes");
		break;
	case "latLongColumns" :

		fragmentHTML = "<span class='colOptions'>";

		fragmentHTML += 
			"<select class='latlong-select'>" + 
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

}


/*
 * 
 */
$(document).ready(function() {

	/*
	 * Interval set to check when the ui.typingPanelDiv HTML element is created
	 * and bound to the ui object.
	 */
	var interval = setInterval(function () {
		// log(typeof ui.typingPanelDiv);
		if (typeof ui.typingPanelDiv == 'undefined') {
			log("ui.typingPanelDiv is undefined.")
		} else {

			ui.typingPanel = new TypingPanel(ui.typingPanelDiv);

			ui.leftPanelTabs.unbind('tabsshow');
			ui.leftPanelTabs.bind('tabsshow', function (event, tabs) {
				if (tabs.index === 0) {
					ui.browsingEngine.resize();
				} else if (tabs.index === 1) {
					ui.typingPanel.resize();
				} else if (tabs.index === 2) {
					ui.historyPanel.resize();
				}
			});

			$("div#left-panel div.refine-tabs").tabs('select', 1);
			$("div#left-panel div.refine-tabs").css("visibility", "visible");			

			clearInterval(interval);
		}

	}, 5);


	/*
	 * Interaction when clicking on a wizard header
	 */
	$('a.wizard-header').live("click",function() {
		ui.typingPanel.enterWizard($(this).attr("rel"));
	});

	$("div.cancel-button a.button").live("click",function(){
		ui.typingPanel.destroyColumnSelector();
		ui.typingPanel.exitWizard();
	});

	$("p.description a.ex").live("click",function(){
		
		if($(this).next().css("display") == "none"){
			$(this).next().css("display","block");
		} else {
			$(this).next().hide();
		}
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
		} else {
			ui.typingPanel.buttonSelector($(this),"default");			
		}
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
			LinkedGov.splitVariablePartColumn.initialise(name,separator,splitElement,function(){
				$("input#address-split").removeAttr("checked");
				$("div.split").hide();
			});
		}
	});

	/*
	 * Interaction for the column range select inputs
	 */
	$("div.selector div.range select").live("change",function () {
		ui.typingPanel.rangeSelector($(this));
	});


	/*
	 * 'Remove column' interaction for column lists
	 */
	$("ul.selected-columns li span.remove").live("click",function(){
		ui.typingPanel.removeColumn($(this));
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
			} else {
				$(this).parent("span").parent("li").children("span.year").slideUp(250);
			}
		} else {
			$(this).parent("span").parent("li").children("span.mb4d").slideUp(250);
			$(this).parent("span").parent("li").children("span.year").slideUp(250);
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
	 * Interaction for address column options
	 */
	$("ul.address-checkboxes span.colOptions select").live("change",function(){
		if($(this).val() == "mixed"){
			$(this).parent("span").parent("li").find("span.postcode").data("olddisplay","block");
			$(this).parent("span").parent("li").find("span.postcode").slideDown(250);
		} else {
			$(this).parent("span").parent("li").find("span.postcode").slideUp(250);
		}
	});


	/*
	 * Show tooltips
	 */
	$("a.info").live("mouseover",function () {
		$(this).next("span").show();
	}).live("mouseout",function () {
		$(this).next("span").hide();
	});



});