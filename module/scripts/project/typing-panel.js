function TypingPanel(div) {
	this._div = div;
	this.update();
}

TypingPanel.prototype.resize = function () {
	var body = this._div.find(".typing-panel-body");

	var bodyPaddings = body.outerHeight(true) - body.height();
	body.height((this._div.height() - bodyPaddings) + "px");
	body[0].scrollTop = body[0].offsetHeight;
};

TypingPanel.prototype.update = function (onDone) {
	var self = this;
	self._render();
};

TypingPanel.prototype._render = function () {

	var self = this;

	var elmts = DOM.bind(this._div);

	// make the units text field auto suggest
	$("#unitInputField").suggest().bind("fb-select", function (e, data) {
		// alert(data.name + ", " + data.id);
	});

	elmts.dateTimeButton.click(function () {
		if ($(elmts.moreComplicated).attr('checked')) {

			// var expression =
			// 'cells["year"].value+"-"+cells["day"].value+"-"+cells["month"].value';
			var expression = "";
			var dateOrder = ["Year", "Month", "Day", "Hours", "Minutes", "Seconds"];
			for (var i in dateOrder) {
				$(elmts.colsComplicated).children().each(function () {
					var colname = $(this).children("span").html();
					var datepart = $(this).children("select").val();
					if (datepart == dateOrder[i]) {
						expression += 'cells["' + colname + '"].value+"-"+';
					}
				});
			}
			try {
				expression = expression.substring(0, expression.length - 5);
			} catch (e) {

			}

			var colName = window.prompt("New column name:", theProject.metadata.name);
			Refine.postCoreProcess("add-column", {
				baseColumnName: "year",
				expression: expression,
				newColumnName: colName,
				columnInsertIndex: theProject.columnModel.columns.length + "",
				onError: "keep-original"
			}, null, {
				modelsChanged: true
			});
			Refine.postCoreProcess("text-transform", {
				columnName: colName,
				expression: "value.toDate()",
				repeat: false,
				repeatCount: ""
			}, null, {
				cellsChanged: true
			});

		} else {
			$(elmts.dateTimeColumns).children().each(function () {

				Refine.postCoreProcess("text-transform", {
					columnName: $(this).children("span").html(),
					expression: "value.toDate()",
					repeat: false,
					repeatCount: ""
				}, null, {
					cellsChanged: true
				});
				/*
				 * http://127.0.0.1:3333/command/rdf-extension/save-rdf-schema?project=1702403439701
				 *
				 * var rdfSchemaPost = schema = { "prefixes":[ {
				 * "name":"rdfs",
				 * "uri":"http://www.w3.org/2000/01/rdf-schema#" }, {
				 * "name":"foaf", "uri":"http://xmlns.com/foaf/0.1/" }, {
				 * "name":"xsd", "uri":"http://www.w3.org/2001/XMLSchema#" }, {
				 * "name":"owl", "uri":"http://www.w3.org/2002/07/owl#" }, {
				 * "name":"rdf",
				 * "uri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#" } ],
				 * "baseUri":"http://localhost:3333/", "rootNodes":[ {
				 * "nodeType":"cell-as-resource", "expression":"value",
				 * "isRowNumberCell":true, "rdfTypes":[
				 *  ], "links":[ {
				 * "uri":"http://www.w3.org/2001/XMLSchema#date",
				 * "curie":"xsd:date", "target":{
				 * "nodeType":"cell-as-literal", "expression":"value.(d)",
				 * "columnName":$(this).html(), "isRowNumberCell":false } } ] } ] }
				 *
				 * &engine={"facets":[],"mode":"row-based"};
				 *
				 */
			});
		}
	}); // end dateTimeButton

	elmts.measurementButton.click(function () {

		var prefix = "fb";
		var namespaceURI = "http://rdf.freebase.com/ns/";

		var uri = elmts.unitInputField.data("data.suggest").id;
		uri = type.replace(/\//g, ".");
		uri = namespaceURI + uri.substring(1, measurementURI.length);

		var curie = measurementURI.split(".");
		curie = curie[curie.length - 1];
		curie = prefix + ":" + curie;

		$(elmts.measurementsColumns).children().each(function () {

			var jsonObj = {
					"prefixes": [{
						"name": prefix,
						"uri": namespaceURI
					}],
					"baseUri": "http://127.0.0.1:3333/",
					"rootNodes": [{
						"nodeType": "cell-as-resource",
						"expression": "value",
						"isRowNumberCell": true,
						"rdfTypes": [

						             ],
						             "links": [{
						            	 "uri": uri,
						            	 "curie": curie,
						            	 "target": {
						            		 "nodeType": "cell-as-literal",
						            		 "expression": "value",
						            		 "valueType": "http://www.w3.org/2001/XMLSchema#int",
						            		 "columnName": $(this).children("span").html(),
						            		 "isRowNumberCell": false
						            	 }
						             }]
					}]
			};

			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(jsonObj)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					theProject.overlayModels.rdfSchema = jsonObj;
				}
			});

		});

		/*		
		 var cfg = {};
		 cfg.prefixes = [];
		 cfg.prefixes.push({
		 name:"fb",
		 uri:"http://rdf.freebase.com/ns/"
		 });
		 cfg.baseURI = "http://127.0.0.1:3333/";
		 cfg.rootNode.expression = "value";
		 cfg.links = [];
		 cfg.links.push({
		 typeURI : "http://rdf.freebase.com/rdf/en.celsius",
		 curie : "fb:celsius",
		 target : {
		 expression:"value",
		 valueType:"http://www.w3.org/2001/XMLSchema#int",
		 columnName:"temperature",
		 }
		 });
		 console.log(cfg);

		 var json = createRdfPluginJSON(cfg);
		 json = JSON.stringify(json);
		 */

	}); // end measurementsButton

	/*
	 * elmts.latLongButton.click(function(){
	 *
	 * });
	 */

	elmts.addressButton.click(function () {

		var prefix = "ospc";
		var namespaceURI = "http://data.ordnancesurvey.co.uk/ontology/postcode/";
		var type = "postcode";
		var uri = namespaceURI + type;
		var curie = prefix + ":" + type;

		$(elmts.addressColumns).children().each(function () {

			var colName = window.prompt("New column name:", theProject.metadata.name);
			Refine.postCoreProcess("add-column", {
				baseColumnName: $(this).children("span").html(),
				expression: "partition(value,/[A-Z]{1,2}[0-9R][0-9A-Z]? {0,1}[0-9][ABD-HJLNP-UW-Z]{2}/)[1]",
				newColumnName: colName,
				columnInsertIndex: theProject.columnModel.columns.length + "",
				onError: "keep-original"
			}, null, {
				modelsChanged: true
			});

			var jsonObj = {
					"prefixes": [{
						"name": "rdfs",
						"uri": "http://www.w3.org/2000/01/rdf-schema#"
					},
					{
						"name": "ospc",
						"uri": "http://data.ordnancesurvey.co.uk/ontology/postcode/"
					},
					{
						"name": "vcard",
						"uri": "http://www.w3.org/2006/vcard/ns#"
					}],
					"baseUri": "http://127.0.0.1:3333/",
					"rootNodes": [{
						"nodeType": "cell-as-resource",
						"expression": "value",
						"isRowNumberCell": true,
						"rdfTypes": [

						             ],
						             "links": [{
						            	 "uri": "http://www.w3.org/2006/vcard/ns#adr",
						            	 "curie": "vcard:adr",
						            	 "target": {
						            		 "nodeType": "cell-as-resource",
						            		 "expression": "value+\"#address\"",
						            		 "isRowNumberCell": true,
						            		 "rdfTypes": [{
						            			 "uri": "http://www.w3.org/2006/vcard/ns#Address",
						            			 "curie": "vcard:Address"
						            		 }],
						            		 "links": [{
						            			 "uri": "http://data.ordnancesurvey.co.uk/ontology/postcode/postcode",
						            			 "curie": "ospc:postcode",
						            			 "target": {
						            				 "nodeType": "cell-as-resource",
						            				 "expression": "\"http://data.ordnancesurvey.co.uk/id/postcodeunit/\"+value.replace(\" \",\"\")",
						            				 "columnName": colName,
						            				 "isRowNumberCell": false,
						            				 "rdfTypes": [

						            				              ],
						            				              "links": [{
						            				            	  "uri": "http://www.w3.org/2000/01/rdf-schema#label",
						            				            	  "curie": "rdfs:label",
						            				            	  "target": {
						            				            		  "nodeType": "cell-as-literal",
						            				            		  "expression": "value",
						            				            		  "columnName": colName,
						            				            		  "isRowNumberCell": false
						            				            	  }
						            				              }]
						            			 }
						            		 }]
						            	 }
						             }]
					}]
			};

			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(jsonObj)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					theProject.overlayModels.rdfSchema = jsonObj;
				}
			});
		});
	}); // end addressButton

	elmts.multipleColumnsButton.click(function () {

		var colName = window.prompt("New column name:", theProject.metadata.name);

		var config1 = {
				startColumnName: $(elmts.multipleColumnsColumns).children("li").eq(0).find("span").html(),
				columnCount: $(elmts.multipleColumnsColumns).children("li").length,
				combinedColumnName: colName,
				prependColumnName: true,
				separator: LinkedGov._vars.separator,
				ignoreBlankCells: true
		};

		Refine.postCoreProcess(
				"transpose-columns-into-rows", 
				config1,
				null,
				{ modelsChanged: true },
				{
					onDone:function(){

						var config2 = {
								columnName: colName,
								mode: "separator",
								separator: LinkedGov._vars.separator,
								guessCellType: true,
								removeOriginalColumn: true,
								regex:false
						};

						Refine.postCoreProcess(
								"split-column", 
								config2,
								null,
								{ modelsChanged: true },
								{
									onDone: function(){
										$("div.column-header-title span.column-header-name").each(function(){
											if($(this).html() != colName && $(this).html() != colName+" 1" && $(this).html() != colName+" 2" && $(this).html() != "All"){
												Refine.postCoreProcess(
														"fill-down", 
														{
															columnName: $(this).html()
														},
														null,
														{ modelsChanged: true }
												);
											}

										});

									}
								}
						);						
					}
				}
		);	      


		/*

		 */
	}); // end multipleColumnsButton

	this.resize();
};

function createRdfPluginJSON(cfg) {
	var json = {};
	json.prefixes = [];
	json.prefixes.push({
		name: cfg.namespace,
		uri: cfg.namespaceURI
	})
	return json;
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

			clearInterval(interval);

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

			//$(window).unbind("resize").bind("resize", resizeAll);
			//$(window).resize();
		}
	}, 5);

	/*
	 * Interaction for clicking on a question.
	 */
	$('a.question').click(function () {
		if ($(this).hasClass("exp")) {
			$(this).removeClass("exp");
			$("a.info").hide();
			$(this).next('div.question-input').slideUp(function () {
				$(this).find("div.selector").children("div.range").hide();
			});
		} else {
			$("a.info").hide();
			$('div.question-input').slideUp(function () {
				$(this).find("div.selector").children("div.range").hide();
			});
			$('a.question.exp').removeClass("exp");
			$(this).next('div.question-input').slideDown(function () {
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
			$(this).addClass("exp");
		}
		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function () {
			$(this).removeClass("ui-selected");
		});
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

		if ($(this).html() == "Start Select") {
			$(this).parent().parent().children("div.more-complicated").slideUp();
			$(this).parent().parent().children("div.more-complicated").children("ul.cols-copy").html();
			$(this).parent().parent().children("input.more-complicated").removeAttr("checked");

			$cols = $(this).parent().children("ul.column-display");
			$cols.html("");
			$(this).html("End Select");
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
			$(this).html("Start Select");
			$("table.data-table").selectable("destroy");
			$("table.data-table .column-header").each(function () {
				$(this).removeClass("ui-selected");
			});
		}
	});

	/*
	 * Interaction for the column range select inputs
	 */
	$("div.selector div.range select").change(function () {

		$cols = $(this).parent().parent().children("ul.column-display");
		$cols.html("");
		var colsHTML = "";
		var from = 0,
		to = 0;

		if ($(this).hasClass("from")) {
			// Limit the "to" select input
			// Check to see if the other input has been set and
			// adjust the column list
			from = parseInt($(this).find("option[value='" + $(this).val() + "']").attr("data-id"));
			$(this).parent().find("select.to").children("option").each(function () {
				if (parseInt($(this).attr("data-id")) <= from) {
					$(this).attr("disabled", "true");
				} else {
					$(this).removeAttr("disabled");
				}
			});
		} else if ($(this).hasClass("to")) {
			// Limit the first select input
			// Check to see if the other input has been set and
			// adjust the column list
			to = parseInt($(this).find("option[value='" + $(this).val() + "']").attr("data-id"));
			$(this).parent().find("select.from").children("option").each(function () {
				if (parseInt($(this).attr("data-id")) >= to) {
					$(this).attr("disabled", "true");
				} else {
					$(this).removeAttr("disabled");
				}
			});
		}

		$(this).find("option").each(function () {
			if (parseInt($(this).attr("data-id")) >= parseInt($(this).parent().parent().children("select.from").find("option[value='" + $(this).parent().parent().children("select.from").val() + "']").attr("data-id")) && parseInt($(this).attr("data-id")) <= parseInt($(this).parent().parent().children("select.to").find("option[value='" + $(this).parent().parent().children("select.to").val() + "']").attr("data-id"))) {
				colsHTML += "<li><span>" + $(this).val() + "</span></li>";
			}
		});

		$cols.html(colsHTML);

	});

	$("input.more-complicated").click(function () {

		$colscopy = $(this).parent().children("div.more-complicated").children("ul.cols-copy");

		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function () {
			$(this).removeClass("ui-selected");
		});

		$colscopy.html($(this).parent().children("div.selector").children("ul.column-display").html());

		$colscopy.children("li").each(function () {
			$(this).html($(this).html() + "<select class='date-select'>" + "<option value='Day'>Day</option>" + "<option value='Month'>Month</option>" + "<option value='Year'>Year</option>" + "<option value='DayMonth'>Day-Month</option>" + "<option value='MonthYear'>Month-Year</option>" + "</select>");
		});

		if (!$(this).attr("checked")) {
			$(this).parent().children("div.more-complicated").slideUp();
			$(this).parent().children("div.selector").children("ul.column-display").slideDown();
		} else {
			$(this).parent().children("div.more-complicated").slideDown();
			$(this).parent().children("div.selector").children("ul.column-display").slideUp();
		}
	});
});