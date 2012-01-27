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

			var myVal = "";

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

							for(var j=0; j<length; j++){

								if(data.facets[i].choices[j].c >= highest){
									value = data.facets[i].choices[j].v.l;
									highest = data.facets[i].choices[j].c;
								}
							}

							i=data.facets.length;

							myVal = value;

						}
					}

				},
				error : function() {
					alert("A problem was encountered when computing facets.");
				}
			});	

			return myVal;
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
						self.setBlanksToNulls(toNulls, columns, i,
								callback);
					},
					error : function() {
						alert("A problem was encountered when performing a text-transform on the column: \""
								+ columns[i].name + "\".");
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
		 * storing the column name in an array of hidden columns using the 
		 * custom "save-meta-information" command.
		 */
		hideColumnCompletely : function(colName, callback) {

			var alreadyAdded = false;

			/*
			 * +3 due to the "All" column
			 */
			var columnIndex = Refine.columnNameToColumnIndex(colName) + 3;

			$("td.column-header").each(function(){
				if($(this).find("span.column-header-name").length > 0 && $(this).find("span.column-header-name").html() == colName){
					$(this).addClass("hiddenCompletely");
				}
			});

			$("table.data-table tr").each(function(){
				$(this).children("td").eq(columnIndex).addClass("hiddenCompletely");
			});

			var array = LG.vars.hiddenColumns.split(",");

			if(array.length > 0 && array[0].length > 0){

				for(var i=0; i<array.length; i++){
					if(array[i] == colName){
						alreadyAdded = true;
					}
				}

				if(!alreadyAdded){
					array.push(colName);
				}

				LG.vars.hiddenColumns = array.join(",");

			} else {
				LG.vars.hiddenColumns = colName;
			}

			if(!alreadyAdded){

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
						//self.importFail("A problem was encountered when saving metadata");
					}
				});

			}

		},

		/*
		 * unhideHiddenColumn
		 * 
		 * Unhides a hidden column, making sure to amend the project's hidden column 
		 * metadata at the same time.
		 */
		unhideHiddenColumn : function(colName, callback) {

			/*
			 * +3 due to the "All" column
			 */
			var columnIndex = Refine.columnNameToColumnIndex(colName) + 3;

			$("td.column-header").each(function(){
				if($(this).find("span.column-header-name").length > 0 && $(this).find("span.column-header-name").html() == colName){
					$(this).removeClass("hiddenCompletely");
				}
			});

			$("table.data-table tr").each(function(){
				$(this).children("td").eq(columnIndex).removeClass("hiddenCompletely");
			});

			var array = LG.vars.hiddenColumns.split(",");

			if(array.length > 0 && array[0].length > 0){

				for(var i=0; i<array.length; i++){
					if(array[i] == colName){
						array.splice(i,1);
						i--;
					}
				}

				LG.vars.hiddenColumns = array.join(",");

			} else {
				log("Cannot unhide column as it is not listed as a hidden column.");
			}

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
		 * from the project's metadata store.
		 * 
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
						log("LG.vars.hiddenColumns = "+LG.vars.hiddenColumns);
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
		 */
		keepHiddenColumnsHidden : function(){

			if(typeof LG.vars.hiddenColumns != 'undefined') {

				var cols = LG.vars.hiddenColumns.split(",");

				for(var i=0;i<cols.length;i++){

					var columnIndex = Refine.columnNameToColumnIndex(cols[i]) + 3;

					if(columnIndex >= 3){

						$("td.column-header").each(function(){
							if($(this).find("span.column-header-name").length > 0 && $(this).find("span.column-header-name").html() == cols[i]){
								$(this).addClass("hiddenCompletely");
							}
						});

						$("table.data-table tr").each(function(){
							$(this).children("td").eq(columnIndex).addClass("hiddenCompletely");
						});
					}
				}	

				if(cols.length == "1" && cols[0].length == 0){
					LG.updateUnhideColumnButton(0);
				} else {
					LG.updateUnhideColumnButton(cols.length);			
				}

			}

			return false;
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

				log("createNewColumns");

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

				log("partitionForLastPart");

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
			},

			/*
			 * onComplete
			 */
			onComplete : function() {
				var self = this;

				Refine.update({
					cellsChanged : true
				}, function() {
					self.vars.splitterHTML.find("ul.selected-columns").html("").hide();
					ui.typingPanel.destroyColumnSelector();
					self.vars.callback();
				});

			}

		}
}


