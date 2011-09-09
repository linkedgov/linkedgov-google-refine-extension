var LinkedGov = {

		vars : {
			separator: "<LG>",
			nullValue:"<LG_NULL>",
			cellsSetToBlank:false
		},

		_initialise: function() {

			this._restyle();
			this._injectTypingPanel();
		},

		_restyle: function() {
			$("body").addClass("lg");
		},

		_injectTypingPanel: function() {

			$(".refine-tabs ul li").eq(0).after('<li><a href="#refine-tabs-typing">Typing</a></li>');
			$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));

			$.getScript(ModuleWirings["linkedgov"] + 'scripts/project/typing-panel.js');

		},

		_setFacetCountLimit: function(n){
			$.post(
					"/command/core/set-preference",
					{
						name : "ui.browsing.listFacet.limit",
						value : n
					},
					function(o) {
						if (o.code == "ok") {
							ui.browsingEngine.update();
						} else if (o.code == "error") {
							alert(o.message);
						}
					},
					"json"
			);			
		},

		_setBlanksToNull: function(columns,i,callback){

			var self = this;

			//log("_setBlanksToNull");
			//log(i);
			//log("++++++++++++++++++++++++++++");

			if(i < columns.length){

				$.post(
						"/command/" + "core" + "/" + "text-transform" + "?" + $.param({
							columnName: columns[i].name, 
							expression: "if(isBlank(value),\""+LinkedGov.vars.nullValue+"\",value)", 
							onError: "set-to-blank",
							repeat: false,
							repeatCount: 10,
							project:theProject.id
						}),
						null,
						function(){
							i = i+1;
							self._setBlanksToNull(columns,i,callback);
						},
						"json"
				);

			} else {
				log("_setBlanksToNull complete");
				self.vars.cellsSetToBlank = true;
				Refine.update({cellsChanged:true});
				callback();
			}

		},

		loadHTMLCallback: function(htmlPage) {

			//alert(htmlPage+" has been loaded");

			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			var pageName = htmlPage.replace(".html","");

			switch(pageName) {

			case 'typing-panel' :

				break;

			default:
				break;
			}

			return false;
		}

};

LinkedGov.multipleColumnsOperation = {

		vars : {
			origColName:"",
			newColName:"",
			colCount:0
		},

		intialise: function(origColName,colCount,newColName){

			log("Starting multipleColumnsOperation");

			var self = this;

			self.vars.origColName = origColName;
			self.vars.newColName = newColName;
			self.vars.colCount = colCount;

			if(LinkedGov.vars.cellsSetToBlank){
				log("multipleColumnsOperation - blank cells are already nulls");
				self.transposeColumns();
			} else {
				log("multipleColumnsOperation - blank cells need to be nulls");	
				LinkedGov._setBlanksToNull(theProject.columnModel.columns,0,function(){
					log("_setBlanksToNull callback");
					self.transposeColumns();
				});

			}

		},

		transposeColumns: function(){

			log("transposeColumns");

			var self = this;

			var config1 = {
					startColumnName: self.vars.origColName,
					columnCount: self.vars.colCount,
					combinedColumnName: self.vars.newColName,
					prependColumnName: true,
					separator: LinkedGov.vars.separator,
					ignoreBlankCells: true
			};

			Refine.postCoreProcess(
					"transpose-columns-into-rows", 
					config1,
					null,
					{ modelsChanged: true },
					{
						onDone:function(){
							self.splitColumns();
						}
					}
			);	  			
		},

		splitColumns: function(){

			var self = this;

			var config2 = {
					columnName: self.vars.newColName,
					mode: "separator",
					separator: LinkedGov.vars.separator,
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

							self.fillDownColumns(theProject.columnModel.columns,0);
						}
					}
			);				
		},

		fillDownColumns:function(columns,i){

			var self = this;

			//log("fillDownColumns");
			//log(i);
			//log("-----------------------------");

			if(i < columns.length) {
				if(columns[i].name != self.vars.newColName && columns[i].name != self.vars.newColName+" 1" && columns[i].name != self.vars.newColName+" 2"){

					$.post(
							"/command/" + "core" + "/" + "fill-down" + "?" + $.param({
								columnName: columns[i].name,
								project:theProject.id
							}),
							null,
							function(){
								i = i+1;
								self.fillDownColumns(columns,i);
							},
							"json"
					);

				}
			} else {
				log("filDownColumns complete, i = "+i);		
				Refine.update({modelsChanged:true});
				self.onComplete();
			}

		},

		onComplete:function(){
			log("multipleColumnsOperation complete");
		}
}

LinkedGov.multipleValuesOperation = {

		vars:{
			headersColName:"",
			valuesColName:"",
			colsToExclude:""
		},

		initialise: function(headersColName, valuesColName, colsToExclude) {

			var self = this;

			// Set the facet choice count limit high enough to avoid any 
			// returned errors when counting unique values for sorting by 
			// columns.
			LinkedGov._setFacetCountLimit(1000);

			// headersColName = the column with multiple values to be converted to column headers
			// valuesColName = the column that contains the values of the new columns
			// colsToExclude = the columns that should not be included in the sorting order (i.e. 
			// any other measurements not related to the headers/values column.
			self.vars.headersColName = headersColName;
			self.vars.valuesColName = valuesColName;
			self.vars.colsToExclude = colsToExclude;	

			if(LinkedGov.vars.cellsSetToBlank){
				log("multipleValuesOperation - blank cells are already nulls");	
				self.getColumnHeaders();
			} else {
				log("multipleValuesOperation - blank cells need to be nulls");	
				LinkedGov._setBlanksToNull(theProject.columnModel.columns,0,function(){
					log("_setBlanksToNull callback");
					self.getColumnHeaders();
				});
			}

		},

		getColumnHeaders: function(){

			log("getColumnHeaders beginning");
			var self = this;

			/* for each column header that isn't involved in the transpose
			 *  - find out how many unique values each column has in it
			 *  - push the columns into the sortingObject starting with 
			 *  the column with the highest number of unique values
			 */ 	


			/*
			 * make an array of the column header names to include in the sort
			 */
			var columns = theProject.columnModel.columns;
			var colHeaders = [];
			for(var a=0;a<columns.length;a++){
				if(columns[a].name != self.vars.valuesColName){
					if(self.vars.colsToExclude.length > 0){
						for(var b=0; b<self.vars.colsToExclude.length;b++){
							if(columns[a].name != self.vars.colsToExclude[b]){
								colHeaders.push(columns[a].name);
							}
						}
					} else {
						colHeaders.push(columns[a].name);
					}
				}
			}

			log("this?");log(this);
			log(colHeaders);

			// Sort the columns first, call the transpose function in the callback
			self.sortColumnsByUniqueValues(colHeaders,function(ans){

				log('ans');
				log(ans);

				var highest=0;
				var columnHeadersByUniqueValue = [];
				var columnUniqueValues = ans;

				for(var a=0;a<columnUniqueValues.length;a++){

					if(columnUniqueValues[a].count > highest){

						columnHeadersByUniqueValue.splice(0,0,columnUniqueValues[a].name);
						highest = columnUniqueValues[a].count;

					} else {
						columnHeadersByUniqueValue.splice(1,0,columnUniqueValues[a].name);
					}

				}

				log('columnHeadersByUniqueValue');
				log(columnHeadersByUniqueValue);

				self.reorderRows(columnHeadersByUniqueValue);


			});
		},

		sortColumnsByUniqueValues: function (colHeaders,callback){
			this.columnCountUniqueValues(colHeaders,[],callback);
		},

		columnCountUniqueValues: function(colHeaders,ans,callback){

			var self = this;

			var ans = ans || [];

			log("-----------------------------------")
			log("columnCountUniqueValues:");
			log(colHeaders);
			log(ans);


			if(colHeaders.length > 0){
				var values=0;
				var facetParams = {
						"facets":[
						          {"type":"list",
						        	  "name":colHeaders[0],
						        	  "columnName":colHeaders[0],
						        	  "expression":"value",
						        	  "omitBlank":false,
						        	  "omitError":false,
						        	  "selection":[],
						        	  "selectBlank":false,
						        	  "selectError":false,
						        	  "invert":false
						          }
						          ],
						          "mode":"row-based"
				};

				$.post(
						"/command/core/compute-facets?" + $.param({ project: theProject.id }),
						{ engine: JSON.stringify(facetParams) },
						function(data) {

							for(var h=0;h<data.facets.length;h++){
								if(data.facets[h].columnName == colHeaders[0]){
									if(typeof data.facets[h].choices != 'undefined'){
										for(var i=0;i<data.facets[h].choices.length;i++){
											values++;
										}										
									} else {
										values = 0;
									}
								}
							}

							ans.push({
								name: colHeaders[0],
								count: values
							});


							log('colHeaders');
							log(colHeaders);
							log('ans');
							log(ans);
							log('colHeaders.length');
							log(colHeaders.length);


							colHeaders.splice(0,1);					
							self.columnCountUniqueValues(colHeaders,ans,callback);

						}
				);	

			} else {
				log("colHeaders length is 0");
				callback(ans);
			}
		},

		reorderRows: function(columnHeadersByUniqueValue){

			var self = this;

			// sort columns using the correct order
			// carry on with operation

			log("columnHeadersByUniqueValue 2");
			log(columnHeadersByUniqueValue);

			var sortingObject = {
					criteria:[]
			};

			var columns = theProject.columnModel.columns;
			for(var h=0; h<columnHeadersByUniqueValue.length;h++){
				for(var i=0; i<columns.length; i++){				
					if(columns[i].name == columnHeadersByUniqueValue[h]){
						sortingObject.criteria.push({
							column:columns[i].name,
							valueType:"string",
							reverse:false,
							blankPosition:2,
							errorPosition:1,
							caseSensitive:false
						});
					}

				}			
			}

			log('sortingObject:');
			log(sortingObject);

			Refine.postCoreProcess(
					"reorder-rows",
					null,
					{ "sorting" : JSON.stringify(sortingObject)}, 
					{ rowMetadataChanged: true },
					{
						onDone: function(){
							self.multiValueTranspose();
						}
					}
			);							

		},

		multiValueTranspose:function(){

			var self = this;

			log("multiValueTranspose beginning");

			// Use a facet to calculate how many rows to transpose by
			// (the unique number of values in the header column
			var facetParams = {
					"facets":[
					          {"type":"list",
					        	  "name":self.vars.headersColName,
					        	  "columnName":self.vars.headersColName,
					        	  "expression":"value",
					        	  "omitBlank":false,
					        	  "omitError":false,
					        	  "selection":[],
					        	  "selectBlank":false,
					        	  "selectError":false,
					        	  "invert":false
					          }
					          ],
					          "mode":"row-based"
			};


			$.post(
					"/command/core/compute-facets?" + $.param({ project: theProject.id }),
					{ engine: JSON.stringify(facetParams) },
					function(data) {

						var newHeaders = [];
						for(var h=0;h<data.facets.length;h++){
							if(data.facets[h].columnName == self.vars.headersColName){
								for(var i=0;i<data.facets[h].choices.length;i++){
									newHeaders.push(data.facets[h].choices[i].v.l);
								}										
							}
						}								

						Refine.postCoreProcess(
								"transpose-rows-into-columns", 
								{
									columnName:self.vars.valuesColName,
									rowCount:newHeaders.length
								},
								null,
								{ modelsChanged: true },
								{
									onDone:function(){
										self.removeBlankRows(newHeaders);
									}
								}
						);								
					},
					"json"
			);					

		},

		removeBlankRows:function(newHeaders){

			var self = this;
			/*
			 * Need to use facet functionality to select all blank rows
			 * and then remove those rows.
			 * 
			 *  Doesn't seem possible unless a facet UI container is actually
			 *  created on the screen.
			 */

			ui.browsingEngine.addFacet(
					"list",
					{
						"name": self.vars.valuesColName+" 1",
						"columnName": self.vars.valuesColName+" 1",
						"expression": "isBlank(value)"
					}
			);

			//Refine.update({ engineChanged: true });

			var facets = ui.browsingEngine._facets;
			for(var i=0; i < facets.length; i++){
				//log(facets[i].facet._config.columnName);
				if(facets[i].facet._config.columnName == self.vars.valuesColName+" 1"){
					var blankFacet = facets[i].facet;
					var myInterval = setInterval(function(){
						if(blankFacet._data != null){
							for(var j=0;j<blankFacet._data.choices.length;j++){
								if(blankFacet._data.choices[j].v.l === "true"){
									blankFacet._selection.push(blankFacet._data.choices[j]);
									//Refine.update({ engineChanged: true });
									Refine.postCoreProcess("remove-rows", {}, null, { rowMetadataChanged: true },{
										onDone:function(){

											Refine.postCoreProcess(
													"reorder-rows",
													null,
													{ "sorting" : JSON.stringify({
														column:self.vars.headersColName,
														valueType:"string",
														reverse:false,
														blankPosition:2,
														errorPosition:1,
														caseSensitive:false
													})}, 
													{ rowMetadataChanged: true },
													{
														onDone: function(){

															ui.browsingEngine.removeFacet(blankFacet);
															//Refine.update({ engineChanged: true });

															var oldHeaders = [];
															var columns = theProject.columnModel.columns;
															var count = 1;
															for(var k=0; k<columns.length;k++){
																//log("columns[k].name");log(columns[k].name);
																//log("self.vars.valuesColName+count");log(self.vars.valuesColName+" "+count);
																if(columns[k].name == self.vars.valuesColName+" "+count){
																	oldHeaders.push(columns[k].name);
																	count++;
																}
															}
															newHeaders.sort();
															self.renameMultipleColumns(oldHeaders,newHeaders,function(){
																//log("Removing last column");
																Refine.postCoreProcess(
																		"remove-column", 
																		{
																			columnName: self.vars.headersColName
																		},
																		null,
																		{ modelsChanged: true },
																		{
																			onDone:function(){
																				self.onComplete();
																			}
																		}
																);
															});


														}
													}
											);


										}
									});
								}
							}																
							clearInterval(myInterval);
						} else {
							// wait for facet UI to complete creation
						}
					},1000);
				}
			}		
		},

		renameMultipleColumns: function(oldNames, newNames, callback){

			var self = this;

			//log('oldNames');
			//log(oldNames);
			//log('newNames');
			//log(newNames);

			if(oldNames.length > 0 && newNames.length > 0){
				Refine.postCoreProcess(
						"rename-column", 
						{
							oldColumnName: oldNames[0],
							newColumnName: newNames[0]
						},
						null,
						{ modelsChanged: true },
						{
							onDone:function(){
								oldNames.splice(0,1);
								newNames.splice(0,1);
								if(oldNames.length > 0 && newNames.length > 0){
									self.renameMultipleColumns(oldNames,newNames,callback);
								} else {
									callback();
								}

							}
						}
				);		
			} else {

			}
		},

		onComplete:function(){
			DialogSystem.dismissAll();
			LinkedGov._setFacetCountLimit(100);
		}		

}

DOM.loadHTML = function(module, path) {

	if(path == ""){
		module = "linkedgov";
		path = "";
	}
	var fullPath = ModuleWirings[module] + path;
	if (!(fullPath in DOM._loadedHTML)) {
		$.ajax({
			async: false,
			url: fullPath,
			dataType: "html",
			success: function(html) {
				DOM._loadedHTML[fullPath] = html;
				LinkedGov.loadHTMLCallback(fullPath);
			}
		})
	}
	return DOM._loadedHTML[fullPath];
};

function resizeAll() {
	resize();
	resizeTabs();
	ui.extensionBar.resize();
	ui.typingPanel.resize(); 
	ui.browsingEngine.resize();
	ui.processPanel.resize();
	ui.historyPanel.resize();
	ui.dataTableView.resize();
}

function log(str) {
	window.console && console.log && console.log(str);
}

$(document).ready(function(){

	LinkedGov._initialise();

});