
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
LinkedGov.setFacetCountLimit = function(n) {

	LinkedGov.silentProcessCall({
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

};

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
LinkedGov.setBlanksToNulls = function(toNulls, columns, i, callback) {

	var self = this;
	var expr = "";

	/*
	 * Change the expression used depending on the boolean "toNulls" passed
	 * to the function.
	 */
	if (toNulls) {
		// Set cells to null
		expr = "if(isBlank(value),\"" + LinkedGov.vars.nullValue + "\",value)";
	} else {
		// Set cells to blank
		expr = "if(value==\"" + LinkedGov.vars.nullValue + "\",blank,value)";
	}

	/*
	 * If we haven't iterated through all of the columns yet
	 */
	if (i < columns.length) {

		/*
		 * Post a text-transform process using the isBlank expression,
		 * replacing any blanks with our separator.
		 */
		LinkedGov
		.silentProcessCall({
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
			self.vars.blanksSetToNulls = true;
		} else {
			self.vars.blanksSetToNulls = false;
		}

		Refine.update({
			cellsChanged : true
		}, callback);
	}

},

/*
 * Renames a column
 */
LinkedGov.renameColumn = function(oldName, newName, callback) {
	LinkedGov.silentProcessCall({
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
};

/*
 * Removes a column
 */
LinkedGov.removeColumn = function(colName, callback) {
	LinkedGov.silentProcessCall({
		type : "POST",
		url : "/command/" + "core" + "/" + "remove-column",
		data : {
			columnName : colName
		},
		success : callback,
		error : function() {
			alert("A problem was encountered when removing the column: \""
					+ colName + "\".");
		}
	});
};

/*
 * Split a column
 */
LinkedGov.splitColumn = function(colName, separator, callback) {

	LinkedGov.silentProcessCall({
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
				callback();
			});
		},
		error : function() {
			alert("A problem was encountered when splitting the column: \""
					+ colName + "\".");
		}
	});
};

/*
 * Moves a column left or right
 */
LinkedGov.moveColumn = function(colName, dir, callback) {

	var i = Refine.columnNameToColumnIndex(colName) + (dir == "left" ? -1 : 1);

	LinkedGov.silentProcessCall({
		type : "POST",
		url : "/command/" + "core" + "/" + "move-column",
		data : {
			columnName : colName,
			index : i
		},
		success : callback,
		error : function() {
			alert("A problem was encountered when moving the column: \"" + colName + "\".");
		}
	});

};


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
var splitVariablePartColumn = {

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
						"expression" : "value.split(\"" + self.vars.separator + "\").length()",
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
			LinkedGov.silentProcessCall({
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

			LinkedGov.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "text-transform",
				data : {
					columnName : self.vars.colName,
					expression : 'partition(value,"' + self.vars.separator+ '"+value.split("' + self.vars.separator+ '")[value.split("' + self.vars.separator+ '").length()-2])[0].trim()',
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

};
