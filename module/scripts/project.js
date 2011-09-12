/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The global LinkedGov object for the Project page.
 * 
 * Contents:
 * - Global variables (debug on / off)
 * - Initialisation functions
 * - Initial injection functions
 * - General data operations (set blank cells to null)
 * - Individual wizard operations
 * 
 * Notes:
 * 
 * When posting one of Refine's core process operations using 
 * Refine.postCoreProcess() - a number of UI updates is usually 
 * bundled with it as the expected behaviour is for Refine to 
 * perform a core process with gaps for user input in between. This 
 * isn't the case for the LinkedGov skin as a series of operations are 
 * often strung together and executed rapidly, resulting in flashes of
 * "updating" and "working" messages while operations are performed. To 
 * avoid this, the function call is skipped when possible and replaced 
 * using the minimal AJAX $.post() function, which doesn't carry with it 
 * any of Refine's UI update functions. This replacement has to be used 
 * carefully though as some operations rely on previous updates being 
 * made (i.e. row-removals and row/column transposes require the 
 * data-table to be updated otherwise successive operations will fail 
 * to realise the old rows/columns have been changed).
 * 
 */
var LinkedGov = {

		/*
		 * Variables used in multiple operations
		 */
		vars : {
			debug:true,
			separator: "<LG>",
			nullValue:"<LG_NULL>",
			cellsSetToBlank:false
		},

		/*
		 * initialise
		 * 
		 * Initial styles and injections
		 */
		initialise: function() {
			this.restyle();
			this.injectTypingPanel();
		},

		/*
		 * restyle
		 * 
		 * Any major initial restyling
		 */
		restyle: function() {
			$("body").addClass("lg");
		},

		/*
		 * injectTypingPanel
		 * 
		 * Injects the Typing panel HTML and JS into the page
		 */
		injectTypingPanel: function() {

			// Create the Typing tab
			$(".refine-tabs ul li").eq(0).after('<li><a href="#refine-tabs-typing">Typing</a></li>');
			// Create the Typing panel div
			$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			// Load LinkedGov's Typing panel HTML into the div
			$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));
			// Inject LinkedGov's Typing panel JS into the page
			$.getScript(ModuleWirings["linkedgov"] + 'scripts/project/typing-panel.js');

		},

		/*
		 * setFacetCountLimit
		 * 
		 * Sets the facet count limit. 
		 * If a column has more than 100 unique values, the facet UI 
		 * returns an error, which we don't want when sorting columns 
		 * during the operations.
		 */
		setFacetCountLimit: function(n){
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

		/*
		 * setBlanksToNull
		 * 
		 * Recursive function that applies a text-transform expression to each 
		 * column cell, setting any blank cells to the global nullValue variable.
		 * Usually called at the start of a wizard to avoid "fill-down" and "row-
		 * remove" issues.
		 */
		setBlanksToNull: function(columns,i,callback){

			var self = this;

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
							self.setBlanksToNull(columns,i,callback);
						},
						"json"
				);

			} else {
				log("setBlanksToNull complete");
				self.vars.cellsSetToBlank = true;
				Refine.update({cellsChanged:true},callback);
			}

		},

		/*
		 * setNullsToBlank
		 * 
		 * Recursive function that restores any "nullValue" cells back to 
		 * blanks - usually called at the end of a wizard.
		 */
		setNullsToBlank: function(columns,i,callback){

			var self = this;

			if(i < columns.length){

				$.post(
						"/command/" + "core" + "/" + "text-transform" + "?" + $.param({
							columnName: columns[i].name, 
							expression: "if(value==\""+LinkedGov.vars.nullValue+"\",blank,value)", 
							onError: "set-to-blank",
							repeat: false,
							repeatCount: 10,
							project:theProject.id
						}),
						null,
						function(){
							i = i+1;
							self.setNullsToBlank(columns,i,callback);
						},
						"json"
				);

			} else {
				log("setNullsToBlank complete");
				self.vars.cellsSetToBlank = true;
				Refine.update({cellsChanged:true},callback);
			}

		},

		/*
		 * loadHTMLCallback
		 * 
		 * Called each time HTML is loaded, either through LinkedGov or 
		 * Refine.
		 */
		loadHTMLCallback: function(htmlPage) {

			log(htmlPage+" has been loaded");

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



/*
 * multipleColumnsOperation
 * 
 * Rotates columns to rows (i.e. 24 columns labelled by the hour, 
 * rotated into one column named "Time" with 24 values per every 
 * original row).
 * 
 * The user is asked to select the range of columns to rotate, from 
 * that the following parameters are passed to the wizard:
 * 
 * a) startColName - The column name at the start of the range of columns
 * b) colCount - The number of columns in the range
 * c) newColName - The name for the new column (input by user)
 * 
 * 
 * Operation steps:
 * 
 * 1. initialise()
 * Store global variables, set facet limit and check for blank cells 
 * before beginning the operation.
 * 
 * 2. transposeColumns()
 * Transposes the range of columns into one column using the global
 * LinkedGov 'separator' variable and the operation's global parameters.
 * 
 * 3. splitColumns()
 * Splits the newly created column into two columns using the global 
 * LinkedGov 'separator' variable.
 * 
 * 4. fillDownColumns()
 * Fills in all the blank cells as a result of the transpose.
 *
 *  
 */
LinkedGov.multipleColumnsOperation = {

		vars : {
			startColName:"",
			newColName:"",
			colCount:0
		},

		/*
		 * initialise
		 * 
		 * Fills any blank cells with null values before beginning 
		 * the transpose operation.
		 */
		initialise: function(startColName,colCount,newColName){

			log("Starting multipleColumnsOperation");

			var self = this;

			self.vars.startColName = startColName;
			self.vars.newColName = newColName;
			self.vars.colCount = colCount;

			/*
			 * Pass the project column data as a parameter, the index 0 to begin with, 
			 * and a callback function that commences the operation.
			 * 
			 * Passing self.transpose() as a parameter calls it immediately for some reason.
			 */
			LinkedGov.setBlanksToNull(theProject.columnModel.columns,0,function(){
				self.transposeColumns();
			});

		},

		/*
		 * transposeColumns
		 * 
		 * Uses the operation's global variables to transpose 
		 * the selected column - using the global LinkedGov separator 
		 * as the separator value. 
		 * 
		 * Performs a necessary minimal UI update before calling the 
		 * next operation.
		 * 
		 */
		transposeColumns: function(){

			log("transposeColumns");

			var self = this;

			var config = {
					startColumnName: self.vars.startColName,
					columnCount: self.vars.colCount,
					combinedColumnName: self.vars.newColName,
					prependColumnName: true,
					separator: LinkedGov.vars.separator,
					ignoreBlankCells: true,
					project:theProject.id
			};

			$.post(
					"/command/" + "core" + "/" + "transpose-columns-into-rows" + "?" + $.param(config),
					null,
					function(){
						// The most minimal yet fully-functional UI update 
						Refine.reinitializeProjectData(function(){
							ui.dataTableView.update(function(){
								ui.browsingEngine.update(self.splitColumns());
							});
						});
					},
					"json"
			);

		},

		/*
		 * splitColumns
		 * 
		 * Splits the newly created column using the global 
		 * LinkedGov separator.
		 */
		splitColumns: function(){

			log("splitColumns");

			var self = this;

			var config = {
					columnName: self.vars.newColName,
					mode: "separator",
					separator: LinkedGov.vars.separator,
					guessCellType: true,
					removeOriginalColumn: true,
					regex:false,
					project:theProject.id
			};

			$.post(
					"/command/" + "core" + "/" + "split-column" + "?" + $.param(config),
					null,
					function(){
						self.fillDownColumns(theProject.columnModel.columns,0);					
					},
					"json"
			);

		},

		/*
		 * fillDownColumns
		 * 
		 * A recursive function that takes the column model's 
		 * list of columns and an iterator as parameters.
		 * 
		 * Only fills a column if it's name is not equal to the columns being 
		 * operated on. The +" 1" and +" 2" are always the same after a 
		 * column split.
		 * 
		 * $.post() used to avoid multiple UI "Working" messages.
		 */
		fillDownColumns:function(columns,i){

			var self = this;

//			log("fillDownColumns");
//			log(i);
//			log(columns);
//			log("-----------------------------");

			if(i < columns.length) {

//				log("columns[i].name: "+columns[i].name);
//				log("self.vars.newColName: "+self.vars.newColName);

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

				} else {
					i = i+1;
					self.fillDownColumns(columns,i);					
				}
			} else {
				log("filDownColumns complete, i = "+i);		
				self.onComplete();
			}

		},

		/*
		 * onComplete
		 * 
		 * Sets any null values back to blank and performs a full 
		 * update.
		 */
		onComplete:function(){
			LinkedGov.setNullsToBlank(theProject.columnModel.columns,0,function(){
				log("multipleColumnsOperation complete");
				Refine.update({everythingChanged:true});
			});
			return false;
		}
}

/*
 * multipleValuesOperation
 * 
 * Wizard for transposing a column of multiple values into a set of 
 * new headed columns. The user is asked to select three types of column:
 * 
 * a) headersColName - The column that contains the new header names
 * b) valuesColName - The column that contains the values for the new columns
 * c) colNamesToExclude - Columns that contain values/measurements to avoid
 * 
 * 1. initialise()
 * Store variables, set facet limit and check for blank cells 
 * before beginning the operation.
 * 
 * 2. getSortableColumnHeaders()
 * Find out which column headers are to be used in the "sort", 
 * which allows us to create a patterned situation for the transpose.
 * 
 * 3. reorderRows()
 * Create a sorting object that contains the relevant columns in the 
 * correct order and post the "reorder rows permanently" process.
 * 
 * 4. multiValueTranspose()
 * Use a facet on the 'headers' column to find out how many unique values
 * there are. This number is used as a the "how many rows to transpose by" 
 * parameter. The 'transpose-rows' process is then posted.
 * 
 * 5. removeBlankRows()
 * With blank rows now occurring throughout the data, use an "isBlank" facet 
 * on one of the new columns and post the "remove-all-matching-rows" process.
 * 
 * 6. getNewColumnHeaders()
 * Creates an array of the newly created column names to pass to the next 
 * step.
 * 
 * 7. renameMultipleColumns()
 * Rename the new columns using the unique values from the headers column. 
 * Refine adds iterative integers beginning at "1" for each newly created 
 * column.
 * 
 * 8. removeHeadersColumn()
 * Discard the headers column that contains the new header values.
 * 
 */
LinkedGov.multipleValuesOperation = {

		vars:{
			headersColName:"",
			valuesColName:"",
			colsToExclude:[],
			newHeaders:[]
		},

		/*
		 * initialise
		 * 
		 * Set the facet choice count limit high enough to avoid any 
		 * returned errors when counting unique values for sorting by 
		 * columns.
		 * 
		 */
		initialise: function(headersColName, valuesColName, colsToExclude) {

			var self = this;

			LinkedGov.setFacetCountLimit(1000);

			self.vars.headersColName = headersColName;
			self.vars.valuesColName = valuesColName;
			self.vars.colsToExclude = colsToExclude || [];	

			LinkedGov.setBlanksToNull(theProject.columnModel.columns,0,function(){
				self.getSortableColumnHeaders();
			});

		},

		/*
		 * getSortableColumnHeaders
		 * 
		 * For each column header that isn't involved in the transpose 
		 * - Find out how many unique values each column has
		 * - Push the column names into the sortingObject in order, starting 
		 * with the column with the highest number of unique values.
		 * 
		 */
		getSortableColumnHeaders: function(){

			log("getSortableColumnHeaders");

			var self = this;

			var colHeaders = [];

			/*
			 * - Loop through each columns object
			 * - Check to see if the column name is not equal to the column 
			 * we're operating on and whether there are any column names to 
			 * exclude, otherwise store it as a good column name to sort on.
			 * - If the column name is good but there are columns to exclude, 
			 * we need to check whether this column name exists in the exclude 
			 * array before storing it.
			 */
			$.each(theProject.columnModel.columns,function(key,value){

//				log("self.vars.valuesColName:");
//				log(self.vars.valuesColName);
//				log("self.vars.headersColName:");
//				log(self.vars.headersColName);
//				log("value.name");
//				log(value.name);

				if(value.name != self.vars.valuesColName && $.inArray(value.name, self.vars.colsToExclude) < 0){
					colHeaders.push(value.name);
				}
			});

			log("colHeaders");
			log(colHeaders);

			/*
			 * Sort the columns to produce a 'grouped' situation amongst the rows.
			 * 
			 * Pass a callback function that reorders the columns by the number of 
			 * their unique values.
			 */
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

		/*
		 * sortColumnsByUniqueValues
		 * 
		 * 
		 */
		sortColumnsByUniqueValues: function (colHeaders,callback){
			this.columnCountUniqueValues(colHeaders,[],callback);
		},

		/*
		 * columnCountUniqueValues
		 * 
		 * A recursive function that posts a quick "compute-facet" call to 
		 * retrieve information about the number of unique values in each 
		 * column. This avoids any facets being created and removed on the 
		 * screen, thus saving time.
		 * 
		 * When done, it passes an array of object key-value pairs containing 
		 * the column names and their unique values to the next operation.
		 */
		columnCountUniqueValues: function(colHeaders,ans,callback){

			var self = this;

			var ans = ans || [];

//			log("-----------------------------------")
//			log("columnCountUniqueValues:");
//			log(colHeaders);
//			log(ans);

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
								if(data.facets[h].columnName == colHeaders[0] && typeof data.facets[h].choices != 'undefined'){
									values = data.facets[h].choices.length;
								}
							}

							ans.push({
								name: colHeaders[0],
								count: values
							});

//							log('colHeaders');
//							log(colHeaders);
//							log('ans');
//							log(ans);
//							log('colHeaders.length');
//							log(colHeaders.length);

							colHeaders.splice(0,1);					
							self.columnCountUniqueValues(colHeaders,ans,callback);

						}
				);	

			} else {
				log("colHeaders length is 0");
				callback(ans);
			}
		},

		/*
		 * reorderRows
		 * 
		 * Reorders the rows to produce a 'grouped' situation - ready for 
		 * transposing multiple values.
		 * 
		 * A sorting object has to be created with the relevant "sort criteria" 
		 * objects inside it - in order. This is passed as a parameter to the 
		 * "reorder-rows" process post.
		 */
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

			$.post(
					"/command/" + "core" + "/" + "reorder-rows" + "?" + $.param({ 
						sorting : JSON.stringify(sortingObject), 
						project: theProject.id 
					}),
					null,
					function(){
						self.multiValueTranspose();				
					},
					"json"
			);

		},

		/*
		 * multiValueTranspose
		 * 
		 * Before transposing rows, we need to know how many rows to 
		 * transpose by - this number is equivalent to the number of 
		 * unique values in the multi-valued column.
		 * 
		 * The facet functionality from before is used to get this number.
		 * 
		 * The labels of the unique values in the facet are also extracted 
		 * and used as the new headers for the new columns.
		 */
		multiValueTranspose:function(){

			var self = this;

			log("multiValueTranspose beginning");

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

						for(var h=0;h<data.facets.length;h++){
							if(data.facets[h].columnName == self.vars.headersColName){
								for(var i=0;i<data.facets[h].choices.length;i++){
									self.vars.newHeaders.push(data.facets[h].choices[i].v.l);
								}										
							}
						}								

						$.post(
								"/command/" + "core" + "/" + "transpose-rows-into-columns" + "?" + $.param({
									columnName:self.vars.valuesColName,
									rowCount:self.vars.newHeaders.length,
									project: theProject.id
								}),
								null,
								function(){
									Refine.update({modelsChanged:true},function(){
										self.removeBlankRows();				
									});
								},
								"json"
						);
					},
					"json"
			);					

		},

		/*
		 * A large number of blank rows have been generated from the transpose
		 * which need to be removed.
		 * 
		 * Facet functionality is used again. By creating a facet on one of the new 
		 * columns using the "isBlank" expression, the data table is updated to show 
		 * only the blank rows which are to be removed.
		 */
		removeBlankRows:function(){

			var self = this;

			/*
			 *  It doesn't seem possible to use the facet functionality "behind-the-scenes" 
			 *  for this particular operation. We need to actually update the data table, so 
			 *  a facet has to be added to the UI.
			 */
			ui.browsingEngine.addFacet(
					"list",
					{
						"name": self.vars.valuesColName+" 1",
						"columnName": self.vars.valuesColName+" 1",
						"expression": "isBlank(value)"
					}
			);

			var facets = ui.browsingEngine._facets;
			// For each possible facet on the screen
			for(var i=0; i < facets.length; i++){

				// Find the facet that we have just created
				log(facets[i].facet._config.columnName);

				// The first of the transposed columns will not have the same name
				// as the value stored in the column we
				if(facets[i].facet._config.columnName == self.vars.valuesColName+" 1"){

					// Store it as a variable
					var blankFacet = facets[i].facet;

					// Check that the UI has been created using an interval
					var myInterval = setInterval(function(){
						if(blankFacet._data != null){

							// Check to see if there are both true and false values
							if(blankFacet._data.choices.length > 1){

								// Find the "true" value					
								for(var j=0;j<blankFacet._data.choices.length;j++){
									if(blankFacet._data.choices[j].v.l === "true"){

										// Invoke a selection action on that facet choice
										blankFacet._selection.push(blankFacet._data.choices[j]);

										// Remove the matching rows
										// Have to use the postCoreProcess function here as 
										// the rows are removed while using Refine's facet list JSON object
										Refine.postCoreProcess("remove-rows", {}, null, { rowMetadataChanged: true }, {
											onDone:function(){
												// Pass a count beginning of "1" if multi-values are transposed.
												// Refine adds incremental int's to newly created columns with the same
												// name.
												self.getNewColumnHeaders(blankFacet,1);
											}
										});
									}
								}
							} else {
								// Only one choice, must have been a single value type, 
								// so no rows to remove.
								// Pass a count of 0 if a single value is transposed
								self.getNewColumnHeaders(blankFacet,0);
							}
							clearInterval(myInterval);
						} else {
							// wait for facet UI to complete creation
							log("Blank facet isn't set up yet, waiting 1 second...");
						}
					},1000);
				}
			}		
		},

		
		/*
		 * getNewColumnHeaders
		 * 
		 * Creates an array with the names of the newly created columns in, 
		 * which is then passed to the renameMultipleColumns function so they 
		 * can be renamed using the unique values in the "headers" column.
		 */
		getNewColumnHeaders:function(blankFacet, count){

			var self = this;
			ui.browsingEngine.removeFacet(blankFacet);
			Refine.update({ everythingChanged: true },function(){

				var oldHeaders = [];
				var columns = theProject.columnModel.columns;
				for(var k=0; k<columns.length;k++){
					if(count > 0){
						if(columns[k].name == self.vars.valuesColName+" "+count){
							oldHeaders.push(columns[k].name);
							count++;
						}
					} else {						
						if(columns[k].name == self.vars.valuesColName+" 1"){
							oldHeaders.push(columns[k].name);
							k=columns.length;
						}
					}
				}

				self.vars.newHeaders.sort();
				self.renameMultipleColumns(oldHeaders,self.vars.newHeaders);
			});
		},

		/*
		 * renameMultipleColumns
		 * 
		 * Recursive function that takes two arrays as parameters. 
		 * One array for the old column names, and the second array for 
		 * the new column names.
		 * 
		 */
		renameMultipleColumns: function(oldNames, newNames){

			var self = this;

//			log('oldNames');
//			log(oldNames);
//			log('newNames');
//			log(newNames);

			if(oldNames.length > 0 && newNames.length > 0){

				$.post(
						"/command/" + "core" + "/" + "rename-column" + "?" + $.param({
							oldColumnName: oldNames[0],
							newColumnName: newNames[0],
							project: theProject.id
						}),
						null,
						function(){
							oldNames.splice(0,1);
							newNames.splice(0,1);
							if(oldNames.length > 0 && newNames.length > 0){
								self.renameMultipleColumns(oldNames,newNames);
							} else {
								self.removeHeadersColumn();
							}				
						},
						"json"
				);
			} else {
				log("No more columns to rename");
			}
		},

		/*
		 * removeHeadersColumn
		 * 
		 * Removes the column containing the values for the new column 
		 * headers.
		 */
		removeHeadersColumn:function(){

			var self = this;

			log("Removing last column");

			$.post(
					"/command/" + "core" + "/" + "remove-column" + "?" + $.param({
						columnName: self.vars.headersColName,
						project: theProject.id
					}),
					null,
					function(){
						self.onComplete();			
					},
					"json"
			);
		},

		/*
		 * onComplete
		 * 
		 * Sets any null cells back to being blank, dismisses any "Working..." 
		 * messages, resets the facet count limit and performs an update.
		 */
		onComplete:function(){
			LinkedGov.setNullsToBlank(theProject.columnModel.columns,0,function(){
				DialogSystem.dismissAll();
				LinkedGov.setFacetCountLimit(100);
				Refine.update({everythingChanged:true});
			});
			return false;
		}		

}

/*
 * DOM.loadHTML
 * 
 * An overriding function that allows a callback function
 * to be called on the success of any HTML injection.
 * 
 * Overriding the main DOM.loadHTML function allows us to inject 
 * our own JS whenever Refine injects HTML.
 */
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

/*
 * resizeAll
 * 
 * Another overriding function that includes our custom "typingPanel"
 * object.
 */
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
	window.console && console.log && LinkedGov.vars.debug && console.log(str);
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function(){
	LinkedGov.initialise();
});