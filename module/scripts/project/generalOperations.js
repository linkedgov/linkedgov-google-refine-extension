/*
 * LinkedGov extension for Google Refine
 * Author: Dan Smith
 * 
 * generalOperations.js
 * 
 * Generic operations used by the wizards
 * 
 * Accessed as LG.ops.fn
 * 
 */

var LinkedGov_generalOperations = {

		/*
		 * Returns true or false depending on whether a column 
		 * name exists already.
		 */
		isUniqueColumnName : function(name){
			var columns = theProject.columnModel.columns;
			for(var i=0;i<columns.length;i++){
				if(name == columns[i].name)
					return false;
			}
			return true;
		},

		/*
		 * setFacetCountLimit
		 * 
		 * Sets the facet count limit.
		 * 
		 * If a facet has more than 100 values - it won't display / return an error
		 * in the JSON object.
		 * 
		 * Sometimes we will need to adjust this to perform operations.
		 */
		setFacetCountLimit : function(n) {

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "set-preference",
				data : {
					name : "ui.browsing.listFacet.limit",
					value : n
				},
				success : function(o) {
					if (o.code == "ok") {
						ui.browsingEngine.update();
					} else if (o.code == "error") {
						alert(o.message);
					}
				},
				error : function() {
					alert("A problem was encountered when setting the facet count limit.");
				}
			});

		},

		/*
		 * removeFacet
		 * 
		 * Removes a facet using a column name.
		 */
		removeFacet : function(colName) {

			var facets = ui.browsingEngine._facets;

			for(var i=0; i < facets.length; i++){

				if(facets[i].facet._config.columnName == colName){

					facets[i].facet._remove();
				}
			}

			return false;
		},


		/*
		 * findHighestFacetValue
		 * 
		 */
		findHighestFacetValue : function(colName, expression){

			// log("findHighestFacetValue");

			var result = "";

			/*
			 * Build a parameter object using the first of the column names.
			 */
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : colName,
						"columnName" : colName,
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

			$.ajax({
				async : false,
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams),
					project : theProject.id
				},
				success : function(data) {
					/*
					 * Loop through the UI facets
					 */
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
							var value = "";
							var length = data.facets[i].choices.length;
							var intsPresent = false;
							var floatsPresent = false;

							for(var j=0; j<length; j++){

								if(data.facets[i].choices[j].c >= highest){
									value = data.facets[i].choices[j].v.l;
									highest = data.facets[i].choices[j].c;
								}

								if(data.facets[i].choices[j].v.l == "int"){
									intsPresent = true;
								} else if(data.facets[i].choices[j].v.l == "float"){
									floatsPresent = true;
								}
							}

							i=data.facets.length;

							if(intsPresent && floatsPresent){
								result = "float";
							} else {
								result = value;
							}

						}
					}

				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

			return result;
		},


		/*
		 * computeColumnFacet
		 * 
		 * Retrieves facet data on a column using an expression
		 */
		computeColumnFacet : function(colName, expression, callback){

			// log("computeColumnFacet");

			/*
			 * Build a parameter object using the first of the column names.
			 */
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : colName + " (LG)",
						"columnName" : colName,
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

			$.ajax({
				async : false,
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams),
					project : theProject.id
				},
				success : function(data){
					callback(data);
				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

		},

		/*
		 * setBlanksToNulls
		 * 
		 * Recursive function that applies a text-transform expression to each
		 * column cell, setting any blank cells to the LinkdeGov's global
		 * 'nullValue' variable.
		 * 
		 * Usually called at the start of a wizard to avoid "fill-down" and "row-
		 * remove" issues.
		 */
		setBlanksToNulls : function(toNulls, columns, i, callback) {

			var self = this;
			var expr = "";

			/*
			 * Change the expression used depending on the boolean "toNulls" passed
			 * to the function.
			 */
			if (toNulls) {
				// Set cells to null
				expr = "if(isBlank(value),\"" + LG.vars.nullValue + "\",value)";
			} else {
				// Set cells to blank
				expr = "if(value==\"" + LG.vars.nullValue + "\",blank,value)";
			}

			/*
			 * If we haven't iterated through all of the columns yet
			 */
			if (i < columns.length) {

				/*
				 * Post a text-transform process using the isBlank expression,
				 * replacing any blanks with our separator.
				 */
				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "text-transform",
					data : {
						columnName : columns[i].name,
						expression : expr,
						onError : "keep-original",
						repeat : false,
						repeatCount : 10
					},
					success : function() {
						i = i + 1;
						self.setBlanksToNulls(toNulls, columns, i, callback);
					},
					error : function() {
						alert("A problem was encountered when performing a text-transform on the column: \"" + columns[i].name + "\".");
					}
				});

			} else {
				log("setBlanksToNulls complete");
				/*
				 * Set a global flag that we have set blanks to null
				 */
				if (toNulls) {
					LG.vars.blanksSetToNulls = true;
				} else {
					LG.vars.blanksSetToNulls = false;
				}

				Refine.update({
					cellsChanged : true
				}, callback);
			}

		},

		/*
		 * Renames a column
		 */
		renameColumn : function(oldName, newName, callback) {

			if(newName.match(LG.panels.labellingPanel.illegalCharsRegex)==null){
				// Check if the new column name isn't present somewhere else
				if(LG.ops.isUniqueColumnName(newName)){
					LG.silentProcessCall({
						type : "POST",
						url : "/command/" + "core" + "/" + "rename-column",
						data : {
							oldColumnName : oldName,
							newColumnName : newName
						},
						success : callback,
						error : function() {
							alert("A problem was encountered when renaming the column: \""
									+ oldName + "\".");
						}
					});
				} else {
					alert("Could not rename the \"" + oldName + "\" column to \"" + newName + "\" - a column already exists with that name.");
					return false;
				}
			} else {
				alert("Could not rename the \"" + oldName + "\" column to \"" + newName + "\" - because it contains an " +
						"illegal character.<br /><br />" +
						"Illegal characters:<br />" +
						"<ul class='illegal-chars'><li>!</li><li>\"</li><li>#</li><li>$</li><li>&pound;</li><li>%</li><li>&amp;</li><li>'</li><li>(</li><li>)</li><li>*</li><li>+</li><li>,</li><li>/</li><li>.</li><li>:</li><li>;</li><li>&lt;</li><li>=</li><li>&gt;</li><li>?</li><li>@</li><li>[</li><li>]</li><li>^</li><li>`</li><li>{</li><li>|</li><li>}</li><li>~</li></ul>");
				return false;				
			}
		},

		/*
		 * Removes a column
		 */
		removeColumn : function(colName, callback) {

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "remove-column",
				data : {
					columnName : colName
				},
				success : function(){
					if(callback){
						callback();
					}
				},
				error : function() {
					alert("A problem was encountered when removing the column: \""
							+ colName + "\".");
				}
			});
		},

		/*
		 * parseValueTypesInColumn
		 * 
		 * Types a column within Refine.
		 */
		parseValueTypesInColumn : function(type, columnName){

			var expression = 'value';

			if(type == "int" || type == "float"){
				expression = 'value.replace(",","").toNumber()';
			} else if(type == "date"){
				expression = 'value.toDate()';
			}

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "text-transform",
				data : {
					columnName : columnName,
					expression : expression,
					onError : 'keep-original',
					repeat : false,
					repeatCount : ""
				},
				success : function() {
					Refine.update({cellsChanged : true});
				},
				error : function() {
					alert("Error parsing value types in column");
				}
			});

		},

		/*
		 * Split a column
		 * 
		 * Given a column name and a separator, this generic function
		 * will create two columns, split by the separator.
		 */
		splitColumn : function(colName, separator, callback) {

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "split-column",
				data : {
					columnName : colName,
					mode : "separator",
					separator : separator,
					guessCellType : true,
					removeOriginalColumn : true,
					regex : false
				},
				success : function() {
					Refine.update({
						modelsChanged : true
					}, function() {
						if(callback){
							callback();
						}
					});
				},
				error : function() {
					alert("A problem was encountered when splitting the column: \""
							+ colName + "\".");
				}
			});
		},

		/*
		 * Moves a column left or right
		 */
		moveColumn : function(colName, dir, callback) {

			var i = Refine.columnNameToColumnIndex(colName) + (dir == "left" ? -1 : 1);

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "move-column",
				data : {
					columnName : colName,
					index : i
				},
				success : function(){
					if(callback){
						callback();
					}
				},
				error : function() {
					alert("A problem was encountered when moving the column: \"" + colName + "\".");
				}
			});

		},


		/*
		 * hideColumnCompletely
		 * 
		 * Visually hides the column from the data table as well as 
		 * storing the column name in an array of hidden columns using Refine's
		 * "set-preference" command.
		 */
		hideColumnCompletely : function(colName, callback) {

			var alreadyAdded = false;

			// Hide the column header
			var columnHeaders = ui.dataTableView._columnHeaderUIs;
			for(var i=0;i<columnHeaders.length;i++){
				if(columnHeaders[i]._column.name == colName){
					$(columnHeaders[i]._td).addClass("hiddenCompletely");
				}
			}

			// Hide the column's cells
			// +3 due to the "All" column
			var columnIndex = Refine.columnNameToColumnIndex(colName) + 3;
			$("table.data-table tr").each(function(){
				$(this).children("td").eq(columnIndex).addClass("hiddenCompletely");
			});

			// Store the array of hidden columns
			var array = LG.vars.hiddenColumns.split(",");

			// If we have hidden columns
			if(array.length > 0 && array[0].length > 0){
				// Loop through them
				for(var i=0; i<array.length; i++){
					// Check if we have the column we're looking for
					if(array[i] == colName){
						alreadyAdded = true;
					}
				}

				// If we haven't hidden the column already, then we can add 
				// it to the array of hidden columns
				if(!alreadyAdded){
					array.push(colName);
				}

				// Join the array again, so it's easier to save as a preference value
				LG.vars.hiddenColumns = array.join(",");

			} else {
				// If we don't have any hidden columns yet, then this is the first, so 
				// we can just assign the column name as the concatenated column array.
				LG.vars.hiddenColumns = colName;
			}

			// If we have hidden a new column, then we need to 
			//if(!alreadyAdded){

			var obj = {
					"project" : theProject.id,
					"name" : "LG.hiddenColumns",
					"value" : encodeURIComponent(LG.vars.hiddenColumns)
			};

			$.ajax({
				type : "POST",
				url : "/command/" + "core" + "/" + "set-preference",
				data : $.param(obj),
				success : function(data) {
					if(callback){
						callback();
					}
				},
				error : function() {

				}
			});

			//}

		},

		/*
		 * unhideHiddenColumn
		 * 
		 * Unhides a hidden column, making sure to amend the project's hidden column 
		 * metadata at the same time.
		 */
		unhideHiddenColumn : function(colName, callback) {

			// Remove the hiddenCompletely class from the column header
			var columnHeaders = ui.dataTableView._columnHeaderUIs;
			for(var i=0;i<columnHeaders.length;i++){
				if(columnHeaders[i]._column.name == colName){
					$(columnHeaders[i]._td).removeClass("hiddenCompletely");
				}
			}

			// Remove the hiddenCompletely class from the column cells
			// +3 due to the "All" column
			var columnIndex = Refine.columnNameToColumnIndex(colName) + 3;
			$("table.data-table tr").each(function(){
				$(this).children("td").eq(columnIndex).removeClass("hiddenCompletely");
			});

			// Create an array out of the concatenated string of column names
			var array = LG.vars.hiddenColumns.split(",");
			if(array.length > 0 && array[0].length > 0){
				// Loop through the array and remove the column name that is being removed
				for(var i=0; i<array.length; i++){
					if(array[i] == colName){
						array.splice(i,1);
						i--;
					}
				}
				// Store the joined array again
				LG.vars.hiddenColumns = array.join(",");

			} else {
				log("Cannot unhide column as it is not listed as a hidden column.");
			}

			// Save the joined array using "set-preference"
			var obj = {
					"project" : theProject.id,
					"name" : "LG.hiddenColumns",
					"value" : encodeURIComponent(LG.vars.hiddenColumns)
			};

			$.ajax({
				type : "POST",
				url : "/command/" + "core" + "/" + "set-preference",
				data : $.param(obj),
				success : function(data) {
					if(callback){
						callback();
					}
				},
				error : function() {
					alert("Error saving hidden column metadata")
				}
			});

		},


		/*
		 * eraseHiddenColumnData
		 * 
		 * Erases the hidden column metadata
		 */
		eraseHiddenColumnData : function(callback){

			var obj = {
					"project" : theProject.id,
					"name" : "LG.hiddenColumns",
					"value" : "null"
			};

			$.ajax({
				type : "POST",
				url : "/command/" + "core" + "/" + "set-preference",
				data : $.param(obj),
				success : function(data) {
					if(callback){
						callback();
					}
				},
				error : function() {
					alert("Error erasing hidden column metadata")
				}
			});

		},

		/*
		 * getHiddenColumnMetadata
		 * 
		 * Retrieves the "LG.hiddenColumns" key and it's value 
		 * from the project's preference store.
		 */
		getHiddenColumnMetadata : function(callback){

			$.ajax({
				type : "GET",
				url : "/command/" + "core" + "/" + "get-preference",
				data : $.param({
					project: theProject.id,
					name:"LG.hiddenColumns"
				}),
				success : function(data) {
					if(data.value != null && data.value != "null"){
						LG.vars.hiddenColumns = decodeURIComponent(data.value);
					}
					if(callback){
						callback();
					}
				},
				error: function(){
					alert("Error retrieving hidden column metadata");
				}
			});

		},

		/*
		 * keepHiddenColumnsHidden
		 * 
		 * Whenever Refine updates the data table, it removes the classes from the table 
		 * header - which destroys our RDF symbols and hidden column classes.
		 * 
		 * This function is called in our override of ui.dataTableView.render() inside
		 * LG.loadOperationScripts().
		 */
		keepHiddenColumnsHidden : function(){

			// If we have some hidden column to hide
			if(typeof LG.vars.hiddenColumns != 'undefined') {

				// Split the string into an array of column names
				var cols = LG.vars.hiddenColumns.split(",");

				// Loop through the column names
				for(var i=0; i<cols.length; i++){

					// +3 to skip the "All" column cells
					var columnIndex = Refine.columnNameToColumnIndex(cols[i]) + 3;

					// If the column index is valid
					if(columnIndex >= 3){

						// Add the "hiddenCompletely" class to the column's table header element
						var columnHeaders = ui.dataTableView._columnHeaderUIs;
						for(var j=0;j<columnHeaders.length;j++){
							if(columnHeaders[j]._column.name == cols[i]){
								$(columnHeaders[j]._td).addClass("hiddenCompletely");
							}
						}

						// And add the "hiddenCompletely" class to all of the column's cells in the data table
						$("table.data-table tr").each(function(){
							$(this).children("td").eq(columnIndex).addClass("hiddenCompletely");
						});
					}
				}	

				// Update the "Unhide "X" columns" button in the top right of the 
				// screen
				if(cols.length == "1" && cols[0].length == 0){
					LG.updateUnhideColumnButton(0);
				} else {
					LG.updateUnhideColumnButton(cols.length);			
				}

			}

			return false;
		},


		/*
		 * Trims an object's key-value pair size.
		 * 
		 * Used for the suggest & preview caches when 
		 * reconciling.
		 */
		trimObject:function(object, size){
			var i=0;
			try{
				$.each(object,function(k,v){
					if(i<size){
						i++;
					} else {
						delete obj[k];
					}
				});
			}catch(e){
				//log(e);
			}			
		},

		/*
		 * splitVariablePartColumn
		 * 
		 * Used in the address wizard - this operation takes a 
		 * separator character and a column containing variable length values 
		 * as inputs and performs a safe split (i.e. if the column contains 
		 * cells with between 3 and 7 values separated by a comma, it will split the 
		 * column into 3 columns - gathering the left hand side of the values in the first 
		 * column). 
		 * 
		 * This works well for address columns as street addresses and areas are usually variable 
		 * length - usually leaving the city, country or postcode in a single column.
		 */
		splitVariablePartColumn : {

			vars : {
				colName : "",
				separator : "",
				callback : {},
				splitterHTML : "",
				lowestNumberOfParts : 0
			},

			initialise : function(colName, separator, elBody, callback) {
				var self = this;
				self.vars.colName = colName;
				self.vars.separator = separator;
				self.vars.callback = callback;
				self.vars.splitterHTML = elBody;
				self.findLowestNumberOfParts();
			},

			findLowestNumberOfParts : function() {

				var self = this;
				// Create custom text facet

				/*
				 * Build a parameter object using the first of the column names.
				 */
				var facetParams = {
						"facets" : [ {
							"type" : "list",
							"name" : self.vars.colName,
							"columnName" : self.vars.colName,
							"expression" : "if(isBlank(value),\"\",value.split(\"" + self.vars.separator + "\").length())",
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
						log("data.facets.length = " + data.facets.length);
						for ( var i = 0; i < data.facets.length; i++) {

							/*
							 * If the facet matches the column name and has
							 * choices returned
							 */
							if (data.facets[i].columnName == self.vars.colName && typeof data.facets[i].choices != 'undefined') {
								log("Facet data received successfully");
								/*
								 * Store the lowest number of parts
								 */
								var temp = 9999999;
								for ( var h = 0; h < data.facets[i].choices.length; h++) {
									if (data.facets[i].choices[h].v.v < temp) {
										temp = data.facets[i].choices[h].v.v;
									}
								}
								self.vars.lowestNumberOfParts = temp;

								log("Lowest number of parts for column " + self.vars.colName + ": " + temp);
							}
						}

						if (temp < 2) {
							self.onFail("This split will have no effect as there are single-part values in this column.");
						} else {
							self.createNewColumns(1, self.vars.lowestNumberOfParts - 1);
						}

					},
					error : function() {
						self.onFail("A problem was encountered when computing facets.");
					}
				});

			},

			/*
			 * createNewColumns
			 * 
			 * Recursive function that creates the new columns after splitting the
			 * selected address column.
			 * 
			 * Takes 2 parameters. "partIndex" is the index used to grab the particular
			 * part of the split array, i.e. value.split(",")[partIndex]. colSuffix is
			 * the number used to append to the name of the column when creating the new
			 * columns.
			 * 
			 */
			createNewColumns : function(partIndex, colSuffix) {

				//log("createNewColumns");

				var self = this;
				// Add new columns for value parts depending on the
				// the lowest number of parts

				if (partIndex < self.vars.lowestNumberOfParts && colSuffix > 0) {

					try {
						Refine.postCoreProcess("add-column", {
							baseColumnName : self.vars.colName,
							expression : 'value.split("' + self.vars.separator+ '")[value.split("' + self.vars.separator+ '").length()-' + partIndex + '].trim()',
							newColumnName : self.vars.colName + " " + colSuffix,
							columnInsertIndex : Refine.columnNameToColumnIndex(self.vars.colName) + 1,
							onError : "keep-original"
						}, null, {
							modelsChanged : true
						}, {
							onDone : function() {
								self.createNewColumns(partIndex, colSuffix);
							}
						});
					} catch (e) {
						log("Error: splitVariablePartColumn - createNewColumns()")
						log(e);
						alert("A column already exists with the name " + self.vars.colName + " " + colSuffix + ", \"(LG)\" has been appended to the column name for now.");
						/*
						 * If the error is due to the new column name already existing
						 * then append a more unique suffix
						 */
						Refine.postCoreProcess("add-column", {
							baseColumnName : self.vars.colName,
							expression : 'value.split("' + self.vars.separator+ '")[value.split("' + self.vars.separator+ '").length()-' + partIndex + '].trim()',
							newColumnName : self.vars.colName + " " + colSuffix+ " (LG)",
							columnInsertIndex : Refine.columnNameToColumnIndex(self.vars.colName) + 1,
							onError : "keep-original"
						}, null, {
							modelsChanged : true
						}, {
							onDone : function() {
								self.createNewColumns(partIndex, colSuffix);
							}
						});
					}

					partIndex++;
					colSuffix--;
				} else {
					self.partitionForLastPart();
				}

			},

			partitionForLastPart : function() {

				//log("partitionForLastPart");

				// Finally, perform a text transform on the selected column using
				// the GREL partition function, leaving us with any values upto
				// the last value we created a new colum for.
				var self = this;

				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "text-transform",
					data : {
						columnName : self.vars.colName,
						expression : 'partition(value,"' + self.vars.separator+ '"+value.split("' + self.vars.separator+ '")[value.split("' + self.vars.separator+ '").length()-'+(self.vars.lowestNumberOfParts-1)+'])[0].trim()',
						onError : "keep-original",
						repeat : false,
						repeatCount : 10
					},
					success : function() {
						self.onComplete();
					},
					error : function() {
						self
						.onFail("A problem was encountered when performing a text-transform on the column: \""
								+ self.vars.colName + "\".");
					}
				});

			},

			onFail : function(message) {
				var self = this;
				alert("Column split failed.\n\n" + message);
				self.vars.splitterHTML.find("input#splitCharacter").val("").focus();
				LG.removeColumnOverlays();
			},

			/*
			 * onComplete
			 */
			onComplete : function() {
				var self = this;

				Refine.update({
					cellsChanged : true
				}, function() {
					// Reset the splitting box
					self.vars.splitterHTML.find("ul.selected-columns").html("").hide();
					// Remove all traces of column selection
					LG.removeColumnOverlays();
					self.vars.callback();
				});

			}

		}
}


