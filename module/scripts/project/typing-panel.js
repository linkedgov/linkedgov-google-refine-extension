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
 * Notes:
 * 
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

	var elmts = DOM.bind(this._div);

	// make the measurements text field auto suggest
	$("#unitInputField").suggest().bind("fb-select", function (e, data) {
		// alert(data.name + ", " + data.id);
	});

	/*
	 * When each wizards' "Update" button is clicked, 
	 * their corresponding wizard function is called. Each of the 
	 * wizards have "bind" attributes in their HTML code, which 
	 * allows access to the individual elements through the object
	 * "elmts".
	 */
	elmts.dateTimeButton.click(function () {
		self._destroyColumnSelector();
		LinkedGov.dateTimeWizard.initialise(elmts);
	});

	elmts.measurementsButton.click(function () {
		self._destroyColumnSelector();
		LinkedGov.measurementsWizard.initialise(elmts);
	});

	elmts.latLongButton.click(function(){
		self._destroyColumnSelector();
		LinkedGov.latLongWizard.initialise(elmts);	 
	});

	elmts.addressButton.click(function () {
		self._destroyColumnSelector();
		LinkedGov.addressWizard.initialise(elmts);
	});

	elmts.multipleColumnsButton.click(function () {
		self._destroyColumnSelector();
		LinkedGov.multipleColumnsWizard.initialise(elmts);
	});
	
	elmts.multipleValuesButton.click(function () {
		self._destroyColumnSelector();
		LinkedGov.multipleValuesWizard.initialise(elmts);
	});

	this.resize();
};

/*
 * wizardInteraction
 * 
 * Handles the opening & closing of wizard panels and what to conceal/
 * reveal to the user.
 * 
 * Also populates the range selector inputs with column names on the 
 * callback of opening up.
 */
TypingPanel.prototype.wizardInteraction = function(el) {

	if ($(el).hasClass("exp")) {
		$(el).removeClass("exp");
		$("a.info").hide();
		$(el).next('div.question-input').slideUp(function () {
			$(this).find("div.selector").children("div.range").hide();
		});
	} else {
		$("a.info").hide();
		$('div.question-input').slideUp(function () {
			$(this).find("div.selector").children("div.range").hide();
		});
		$('a.question.exp').removeClass("exp");
		$(el).next('div.question-input').slideDown(function () {
			$("a.info").show();
			//populate the select inputs with column headers
			if ($(this).hasClass("rangeSelect")) {
				$(this).find("div.selector").children("div.range").hide();
				var columnHeaders = "";
				var i = 0;
				$("div.column-header-title span.column-header-name").each(function () {
					if ($(this).html() != "All") {
						columnHeaders += "<option data-id='" + i + "' value='" + $(this).html() + "'>" + $(this).html() + "</option>";
						i++;
					}
				});
				$(this).find("div.selector").children("div.range").children("select").each(function () {
					$(this).html(columnHeaders);
					$(this).val($(this).find("option").eq(0).val());
				});
				$(this).find("div.selector").children("div.range").slideDown();

			}
		});
		$(el).addClass("exp");
	}

	$("div.selector a.button").html("Start Select");
	$("table.data-table").selectable("destroy");
	$("table.data-table .column-header").each(function () {
		$(this).removeClass("ui-selected");
	});	
}

/*
 * columnSelector
 * 
 * Upon clicking the "Select" button in each wizard to select columns, 
 * the jQuery UI "selectable" plugin is invoked and the callbacks for 
 * for the selection actions populate a list in the wizard.
 * 
 */
TypingPanel.prototype.columnSelector = function(button) {

	if ($(button).html() == "Start Select") {

		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function () {
			$(this).removeClass("ui-selected");
		});

		$(button).parent().parent().children("div.more-complicated").slideUp();
		$(button).parent().parent().children("div.more-complicated").children("ul.cols-copy").html();
		$(button).parent().parent().children("input.more-complicated").removeAttr("checked");

		$cols = $(button).parent().children("ul.column-display");
		$cols.html("");
		$(button).html("End Select");
		$("table.data-table").selectable({
			filter: 'td.column-header',
			selected: function (event, ui) {
				// include 'data-' attributes on <li> here about cell
				// information
				$cols.html($cols.html() + "<li><span>" + $(ui.selected).children().find(".column-header-name").html() + "</span></li>").show();
			},
			unselected: function (event, ui) {
				// console.log("unselected");
				$cols.html("").hide();
			},
			selecting: function (event, ui) {
				// console.log("selecting");
			},
			unselecting: function (event, ui) {
				// console.log("unselecting");
				$cols.html("").hide();
			}
		});
	} else {
		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function () {
			$(this).removeClass("ui-selected");
		});
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

	$cols = $(select).parent().parent().children("ul.column-display");
	$cols.html("");
	var colsHTML = "";
	var from = 0, to = 0;

	if ($(select).hasClass("from")) {
		// Limit the "to" select input
		// Check to see if the other input has been set and
		// adjust the column list
		from = parseInt($(select).find("option[value='" + $(select).val() + "']").attr("data-id"));
		$(select).parent().find("select.to").children("option").each(function () {
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
		if (parseInt($(this).attr("data-id")) >= parseInt($(this).parent().parent().children("select.from").find("option[value='" + $(this).parent().parent().children("select.from").val() + "']").attr("data-id")) && parseInt($(this).attr("data-id")) <= parseInt($(this).parent().parent().children("select.to").find("option[value='" + $(this).parent().parent().children("select.to").val() + "']").attr("data-id"))) {
			colsHTML += "<li><span>" + $(this).val() + "</span></li>";
		}
	});

	$cols.html(colsHTML);	
}

/*
 * Destroys the jQuery UI 'selectable' object when a new wizard 
 * is started/finished.
 */
TypingPanel.prototype._destroyColumnSelector = function() {
	$("div.selector a.button").html("Start Select");
	$("table.data-table").selectable("destroy");
	$("table.data-table .column-header").each(function () {
		$(this).removeClass("ui-selected");
	});	
}

$(document).ready(function () {

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
	 * Interaction when clicking on a wizard.
	 */
	$('a.question').click(function () {
		ui.typingPanel.wizardInteraction($(this));
	});

	$("a.info").mouseover(function () {
		$(this).next("span").show();
	}).mouseout(function () {
		$(this).next("span").hide();
	});

	/*
	 * Interaction for the column selector button
	 */
	$("div.selector a.button").click(function () {
		ui.typingPanel.columnSelector($(this));
	});

	/*
	 * Interaction for the column range select inputs
	 */
	$("div.selector div.range select").change(function () {
		ui.typingPanel.rangeSelector($(this));
	});

	$("input.date-complicated").click(function () {

		$colscopy = $(this).parent().children("div.date-complicated").children("ul.cols-copy");

		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function () {
			$(this).removeClass("ui-selected");
		});

		$colscopy.html($(this).parent().children("div.selector").children("ul.column-display").html());

		$colscopy.children("li").each(function () {
			$(this).html($(this).html() + "<select class='date-select'>" + 
					"<option value='Day'>Day</option>" + 
					"<option value='Month'>Month</option>" + 
					"<option value='Year'>Year</option>" + 
					"<option value='DayMonth'>Day-Month</option>" + 
					"<option value='MonthYear'>Month-Year</option>" + 
			"</select>");
		});

		if (!$(this).attr("checked")) {
			$(this).parent().children("div.date-complicated").slideUp();
			$(this).parent().children("div.selector").children("ul.column-display").slideDown();
		} else {
			$(this).parent().children("div.date-complicated").slideDown();
			$(this).parent().children("div.selector").children("ul.column-display").slideUp();
		}
	});
});