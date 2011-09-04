function TypingPanel(div) {
  this._div = div;
  this.update();
}

TypingPanel.prototype.resize = function() {
  var body = this._div.find(".typing-panel-body");

  var bodyPaddings = body.outerHeight(true) - body.height();
  body.height((this._div.height() - bodyPaddings) + "px");
  body[0].scrollTop = body[0].offsetHeight;
};

TypingPanel.prototype.update = function(onDone) {
  var self = this;
  self._render();
};

TypingPanel.prototype._render = function() {

  var self = this;
  
  var elmts = DOM.bind(this._div);
  
  $('a.question').click(function(){
	  if($(this).hasClass("exp")){
		$(this).removeClass("exp");
		$("a.info").hide();
		$(this).next('div.question-input').slideUp();
	  }else{
		$("a.info").hide();
		$('div.question-input').slideUp();
		$('a.question.exp').removeClass("exp");
	  	$(this).next('div.question-input').slideDown(function(){
	  		$("a.info").show();
	  	});
	  	$(this).addClass("exp");
	  }
	$("div.selector a.button").html("Start Select");
	$("table.data-table").selectable("destroy");
	$("table.data-table .column-header").each(function(){
		$(this).removeClass("ui-selected");
	});	  
  }); 
  
  $("a.info").mouseover(function(){
	  $(this).next("span").show();
  }).mouseout(function(){
	  $(this).next("span").hide();
  });
  
  
	// make the units text field auto suggest
	$("#unitInputField")
		.suggest()
		.bind("fb-select", function(e, data) {
				// alert(data.name + ", " + data.id);
			}
	);  
	
	elmts.dateTimeButton.click(function(){
		if($(elmts.moreComplicated).attr('checked')){

			// var expression =
			// 'cells["year"].value+"-"+cells["day"].value+"-"+cells["month"].value';
			
			var expression = "";
			var dateOrder = ["Year","Month","Day","Hours","Minutes","Seconds"];
			for(var i in dateOrder){
				$(elmts.colsComplicated).children().each(function(){
					var colname = $(this).children("span").html();
					var datepart = $(this).children("select").val();					
					if(datepart == dateOrder[i]){
						expression += 'cells["'+colname+'"].value+"-"+';	
					}				
				});	
			}
			try{
				expression = expression.substring(0, expression.length-5);
			}catch(e){
				
			}
			
			var colName = window.prompt("New column name:", theProject.metadata.name);
		    Refine.postCoreProcess(
		        "add-column", 
		        {
				    baseColumnName: "year", 
				    expression: expression,
				    newColumnName: colName,
				    columnInsertIndex: theProject.columnModel.columns.length+"",
				    onError:"keep-original"
		        },
		        null,
		        { modelsChanged: true }
		    );
	        Refine.postCoreProcess(
			  "text-transform",
			  {
			    columnName: colName, 
			    expression: "value.toDate()",
			    repeat: false,
			    repeatCount: ""
			  },
			  null,
			  { cellsChanged: true }
			);        
	        
		} else {
			$(elmts.dateTimeColumns).children().each(function(){
					
			        Refine.postCoreProcess(
					  "text-transform",
					  {
					    columnName: $(this).children("span").html(), 
					    expression: "value.toDate()",
					    repeat: false,
					    repeatCount: ""
					  },
					  null,
					  { cellsChanged: true }
					);
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
	});
	
	
	elmts.measurementButton.click(function(){
		
		var prefix = "fb";
		var namespaceURI = "http://rdf.freebase.com/ns/";
		
		var uri = elmts.unitInputField.data("data.suggest").id;
		uri = type.replace(/\//g,".");
		uri = namespaceURI+uri.substring(1,measurementURI.length);
		
		var curie = measurementURI.split(".");
		curie = curie[curie.length-1];
		curie = prefix+":"+curie;
				
		$(elmts.measurementsColumns).children().each(function(){

			var jsonObj = {
					   "prefixes":[
					  {
					     "name":prefix,
					     "uri":namespaceURI
					      }
					   ],
					   "baseUri":"http://127.0.0.1:3333/",
					   "rootNodes":[
					  {
					     "nodeType":"cell-as-resource",
					     "expression":"value",
					     "isRowNumberCell":true,
					     "rdfTypes":[
					
					     ],
					     "links":[
					        {
					           "uri":uri,
					           "curie":curie,
					           "target":{
					              "nodeType":"cell-as-literal",
					              "expression":"value",
					              "valueType":"http://www.w3.org/2001/XMLSchema#int",
					              "columnName":$(this).children("span").html(),
					              "isRowNumberCell":false
					               }
					            }
					         ]
					      }
					   ]
			};
			
	    	Refine.postProcess(
	    	        "rdf-extension",
	                "save-rdf-schema",
	                {},
	                { schema: JSON.stringify(jsonObj) },
	                {},
	                {   
	                    onDone: function() {
	                        //DialogSystem.dismissUntil(self._level - 1);
	                        theProject.overlayModels.rdfSchema = jsonObj;
	                    }
	                }
	        );
			
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
	
	});
	
	/*
	 * elmts.latLongButton.click(function(){
	 * 
	 * });
	 */

	 elmts.addressButton.click(function(){

		var prefix = "ospc";
		var namespaceURI = "http://data.ordnancesurvey.co.uk/ontology/postcode/";
		var type = "postcode";
		var uri = namespaceURI+type;		
		var curie = prefix+":"+type;
			
		 $(elmts.addressColumns).children().each(function(){

				var colName = window.prompt("New column name:", theProject.metadata.name);
			    Refine.postCoreProcess(
			        "add-column", 
			        {
					    baseColumnName: $(this).children("span").html(), 
					    expression: "partition(value,/[A-Z]{1,2}[0-9R][0-9A-Z]? {0,1}[0-9][ABD-HJLNP-UW-Z]{2}/)[1]",
					    newColumnName: colName,
					    columnInsertIndex: theProject.columnModel.columns.length+"",
					    onError:"keep-original"
			        },
			        null,
			        { modelsChanged: true }
			    );		        
	    
				var jsonObj = {
						   "prefixes":[
						               {
						                  "name":"rdfs",
						                  "uri":"http://www.w3.org/2000/01/rdf-schema#"
						               },
						               {
						                  "name":"ospc",
						                  "uri":"http://data.ordnancesurvey.co.uk/ontology/postcode/"
						               },
						               {
						                  "name":"vcard",
						                  "uri":"http://www.w3.org/2006/vcard/ns#"
						               }
						   ],
						   "baseUri":"http://127.0.0.1:3333/",
						   "rootNodes":[
						               {
						                  "nodeType":"cell-as-resource",
						                  "expression":"value",
						                  "isRowNumberCell":true,
						                  "rdfTypes":[

						                  ],
						                  "links":[
						                     {
						                        "uri":"http://www.w3.org/2006/vcard/ns#adr",
						                        "curie":"vcard:adr",
						                        "target":{
						                           "nodeType":"cell-as-resource",
						                           "expression":"value+\"#address\"",
						                           "isRowNumberCell":true,
						                           "rdfTypes":[
						                              {
						                                 "uri":"http://www.w3.org/2006/vcard/ns#Address",
						                                 "curie":"vcard:Address"
						                              }
						                           ],
						                           "links":[
						                              {
						                                 "uri":"http://data.ordnancesurvey.co.uk/ontology/postcode/postcode",
						                                 "curie":"ospc:postcode",
						                                 "target":{
						                                    "nodeType":"cell-as-resource",
						                                    "expression":"\"http://data.ordnancesurvey.co.uk/id/postcodeunit/\"+value.replace(\" \",\"\")",
						                                    "columnName":colName,
						                                    "isRowNumberCell":false,
						                                    "rdfTypes":[

						                                    ],
						                                    "links":[
						                                       {
						                                          "uri":"http://www.w3.org/2000/01/rdf-schema#label",
						                                          "curie":"rdfs:label",
						                                          "target":{
						                                             "nodeType":"cell-as-literal",
						                                             "expression":"value",
						                                             "columnName":colName,
						                                             "isRowNumberCell":false
						                                          }
						                                       }
						                                    ]
						                                 }
						                              }
						                           ]
						                        }
						                     }
						                  ]
						               }
						            ]
						         };
				
		    	Refine.postProcess(
		    	        "rdf-extension",
		                "save-rdf-schema",
		                {},
		                { schema: JSON.stringify(jsonObj) },
		                {},
		                {   
		                    onDone: function() {
		                        //DialogSystem.dismissUntil(self._level - 1);
		                        theProject.overlayModels.rdfSchema = jsonObj;
		                    }
		                }
		        );			    
			    
			    
		 });		 
	 });
	 
  this.resize();
};

function createRdfPluginJSON(cfg){
	var json = {};
	json.prefixes = [];
	json.prefixes.push({
		name:cfg.namespace,
		uri:cfg.namespaceURI
	})
	return json;
}

$(document).ready(function(){

	/*
	 * Interval set to check when the ui.typingPanelDiv HTML element is created
	 * and bound to the ui object.
	 */
	var interval = setInterval(function(){
		// log(typeof ui.typingPanelDiv);
		if(typeof ui.typingPanelDiv == 'undefined'){
			log("ui.typingPanelDiv is undefined.")
		}else{
			
			clearInterval(interval);
			
			ui.typingPanel = new TypingPanel(ui.typingPanelDiv);

			ui.leftPanelTabs.unbind('tabsshow');
			ui.leftPanelTabs.bind('tabsshow', function(event, tabs) {
				if (tabs.index === 0) {
					  ui.browsingEngine.resize();
				} else if (tabs.index === 1) {				      
				      ui.typingPanel.resize();
				} else if (tabs.index === 2) {
				      ui.historyPanel.resize();    
				}
			});	
			
			$("div#left-panel div.refine-tabs").tabs('select', 1);
			$("div#left-panel div.refine-tabs").css("visibility","visible");
			
			//$(window).unbind("resize").bind("resize", resizeAll);
			//$(window).resize();

		}
	},5);	
	
	$("div.selector a.button").click(function(){
		
		if($(this).html() == "Start Select"){
			$(this).parent().parent().children("div.more-complicated").slideUp();
			$(this).parent().parent().children("div.more-complicated").children("ul.cols-copy").html();
			$(this).parent().parent().children("input.more-complicated").removeAttr("checked");
			
			$cols = $(this).parent().children("ul.column-display");
			$cols.html("");
			$(this).html("End Select");
			$("table.data-table").selectable({ 
				filter: 'td.column-header',
				selected: function(event, ui){
					// include 'data-' attributes on <li> here about cell
					// information
					$cols.html($cols.html()+"<li><span>"+$(ui.selected).children().find(".column-header-name").html()+"</span></li>").show();
				},
				unselected:function(event, ui){
					// console.log("unselected");
					$cols.html("").hide();
				},
				selecting:function(event, ui){
					// console.log("selecting");
				},
				unselecting:function(event, ui){
					// console.log("unselecting");
					$cols.html("").hide();
				}
			});
		}else{
			$(this).html("Start Select");
			$("table.data-table").selectable("destroy");
			$("table.data-table .column-header").each(function(){
				$(this).removeClass("ui-selected");
			});		
		}
	});

	$("input.more-complicated").click(function(){
		
		$colscopy = $(this).parent().children("div.more-complicated").children("ul.cols-copy");
		
		$("div.selector a.button").html("Start Select");
		$("table.data-table").selectable("destroy");
		$("table.data-table .column-header").each(function(){
			$(this).removeClass("ui-selected");
		});
		
		$colscopy.html($(this).parent().children("div.selector").children("ul.column-display").html());
		
		$colscopy.children("li").each(function(){
			$(this).html($(this).html()+"<select class='date-select'>"+
					"<option value='Day'>Day</option>" +
					"<option value='Month'>Month</option>" +
					"<option value='Year'>Year</option>" +
					"<option value='DayMonth'>Day-Month</option>" +
					"<option value='MonthYear'>Month-Year</option>" +
					"</select>");
		})
		if(!$(this).attr("checked")){
			$(this).parent().children("div.more-complicated").slideUp();
			$(this).parent().children("div.selector").children("ul.column-display").slideDown();
		}else {
			$(this).parent().children("div.more-complicated").slideDown();
			$(this).parent().children("div.selector").children("ul.column-display").slideUp();
		}
	});	
});