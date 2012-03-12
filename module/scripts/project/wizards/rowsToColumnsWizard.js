
/*
 * rowsToColumnsWizard
 * 
 * Wizard for transposing a column of multiple values into a set of new headed
 * columns. The user is asked to select three types of column:
 * 
 * a) headersColName - The column that contains the new header names b)
 * valuesColName - The column that contains the values for the new columns c)
 * colNamesToExclude - Columns that contain values/measurements to avoid
 * 
 * 1. initialise() Store variables, set facet limit and check for blank cells
 * before beginning the operation.
 * 
 * 2. findSortableColumnHeaders() Find out which column headers are to be used
 * in the "sort", which allows us to create a patterned situation for the
 * transpose.
 * 
 * 3. reorderRows() Create a sorting object that contains the relevant columns
 * in the correct order and post the "reorder rows permanently" process.
 * 
 * 4. multiValueTranspose() Use a facet on the 'headers' column to find out how
 * many unique values there are. This number is used as a the "how many rows to
 * transpose by" parameter. The 'transpose-rows' process is then posted.
 * 
 * 5. removeBlankRows() With blank rows now occurring throughout the data, use
 * an "isBlank" facet on one of the new columns and post the
 * "remove-all-matching-rows" process.
 * 
 * 6. getNewColumnHeaders() Creates an array of the newly created column names
 * to pass to the next step.
 * 
 * 7. renameMultipleColumns() Rename the new columns using the unique values
 * from the headers column. Refine adds iterative integers beginning at "1" for
 * each newly created column.
 * 
 * 8. removeHeadersColumn() Discard the headers column that contains the new
 * header values.
 * 
 */


var LinkedGov_rowsToColumnsWizard = {

		vars : {
			headersColName : "",
			valuesColName : "",
			colsToExclude : [],
			newHeaders : [],
			abortOperation : false,
			abortMessage : "",
			elmts : {}
		},

		/*
		 * initialise
		 * 
		 * Set the facet choice count limit high enough to avoid any returned errors
		 * when counting unique values for sorting by columns.
		 * 
		 */
		initialise : function(elmts) {

			var self = this;
			
			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}
			
			self.vars.elmts = elmts;

			// LG.setFacetCountLimit(1000);

			if ($(elmts.rowsToColumnsColumns).children("li").length < 1
					|| $(elmts.rowsToColumnsColumns2).children("li").length < 1) {
				alert("You must select a single column containing multiple types and another "
						+ "column containing their corresponding values.\n\nSelecting any columns "
						+ "to exclude from the operation is optional.");
			} else {

				LG.showWizardProgress(true);

				// Store the column containing the new column header values
				self.vars.headersColName = $(elmts.rowsToColumnsColumns).children(
				"li").eq(0).data("colName");
				// Store the column containing the values for the new columns
				self.vars.valuesColName = $(elmts.rowsToColumnsColumns2).children(
				"li").eq(0).data("colName");

				log(self.vars.headersColName + "," + self.vars.valuesColName);

				/*
				 * Store the columns to exclude from the operation (e.g. a totals
				 * column)
				 */
				$(elmts.rowsToColumnsColumns3).children("li").each(function() {
					self.vars.colsToExclude.push($(this).data("colName"))
				});

				/*
				 * Set blank cells to bull before starting the operation, call the
				 * first wizard operation once complete.
				 */
				LG.ops.setBlanksToNulls(true, theProject.columnModel.columns, 0, function() {
					self.findSortableColumnHeaders();
				});
			}

		},

		/*
		 * findSortableColumnHeaders
		 * 
		 * For each column header that isn't involved in the transpose - Find out
		 * how many unique values each column has - Push the column names into the
		 * sortingObject in order, starting with the column with the highest number
		 * of unique values.
		 * 
		 */
		findSortableColumnHeaders : function() {

			//log("findSortableColumnHeaders");

			var self = this;

			var colHeaders = [];

			/*
			 * - Loop through each of the project's column objects - Check to see if
			 * the column name is not equal to the column we're operating on and
			 * whether there are any column names to exclude, otherwise store it as
			 * a good column name to sort on. - If the column name is good but there
			 * are columns to exclude, we need to check whether this column name
			 * exists in the exclude array before storing it.
			 */
			$.each(theProject.columnModel.columns, function(key, value) {

				// log("self.vars.valuesColName:");
				// log(self.vars.valuesColName);
				// log("self.vars.headersColName:");
				// log(self.vars.headersColName);
				// log("value.name");
				// log(value.name);

				if (value.name != self.vars.valuesColName
						&& $.inArray(value.name, self.vars.colsToExclude) < 0) {
					colHeaders.push(value.name);
				}
			});

			log("Sortable column headers");
			log(colHeaders);

			/*
			 * Sort the columns to produce a 'grouped' situation amongst the rows.
			 * 
			 * Pass a callback function that reorders the columns by the number of
			 * their unique values.
			 */
			self.columnCountUniqueValues(colHeaders, [], function(colCountObj) {
				self.sortColumnsByUniqueValue(colCountObj);
			});
		},

		/*
		 * columnCountUniqueValues
		 * 
		 * A recursive function that posts a silent "compute-facet" call to retrieve
		 * information about the number of unique values in each column. The silent
		 * call avoids any facets being created and removed on the screen.
		 * 
		 * When done, it passes an array of object key-value pairs containing the
		 * column names and their unique values to the next operation.
		 */
		columnCountUniqueValues : function(colHeaders, colCountObj, callback) {

			var self = this;

			var colCountObj = colCountObj || [];

			// log("-----------------------------------")
			// log("columnCountUniqueValues:");
			// log(colHeaders);
			// log(ans);

			/*
			 * While we still have columns to iterate through
			 */
			if (colHeaders.length > 0) {

				/*
				 * Build a parameter object using the first of the column names.
				 */
				var facetParams = {
						"facets" : [ {
							"type" : "list",
							"name" : colHeaders[0],
							"columnName" : colHeaders[0],
							"expression" : "value",
							"omitBlank" : false,
							"omitError" : false,
							"selection" : [],
							"selectBlank" : false,
							"selectError" : false,
							"invert" : false
						} ],
						"mode" : "row-based"
				};

				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "compute-facets",
					data : {
						engine : JSON.stringify(facetParams)
					},
					success : function(data) {

						// Initialise column's unique value count at 0
						var values = 0;

						/*
						 * Loop through the UI facets
						 */
						for ( var h = 0; h < data.facets.length; h++) {
							/*
							 * If the facet matches the column name and has
							 * choices returned
							 */
							if (data.facets[h].columnName == colHeaders[0]
							&& typeof data.facets[h].choices != 'undefined') {
								/*
								 * Store the number of facets choices as the
								 * number of the column's unique values
								 */
								values = data.facets[h].choices.length;

								/*
								 * Check that the headersCol's values have
								 * the same number of values each, if they
								 * don't, then the transpose will not work
								 * unless the 'missing' rows are added.
								 */
								// log(data.facets[h].columnName + '==' +
								// self.vars.headersColName);
								if (data.facets[h].columnName == self.vars.headersColName) {
									log("here");
									for ( var i = 0; i < (values - 1); i++) {
										log("i=" + i);
										if (data.facets[h].choices[i].c != data.facets[h].choices[i + 1].c) {
											self.vars.abortMessage = "Cannot proceed. There aren't an even number of "
												+ "values in the "
												+ self.vars.headersColName
												+ " column.";
											self.vars.abortOperation = true;
										}
									}

								}
							}
						}

						/*
						 * If the "compute-facets" post returns an error
						 * because a column has more than 100 unique values
						 * in, set the column's unique value count to "9999"
						 * (similar to placing the column at the front of
						 * the sorting order).
						 */
						if (values == 0) {
							values = "9999";
						}

						/*
						 * Push the name/unique value count object into an
						 * array.
						 */
						colCountObj.push({
							name : colHeaders[0],
							count : values
						});

						// log('colHeaders');
						// log(colHeaders);
						// log('ans');
						// log(ans);
						// log('colHeaders.length');
						// log(colHeaders.length);

						/*
						 * Remove the column that's just been used
						 */
						colHeaders.splice(0, 1);

						if (!self.vars.abortOperation) {
							self.columnCountUniqueValues(colHeaders,
									colCountObj, callback);
						} else {
							colHeaders = [];
							self
							.onFail("A problem was encountered when computing facets.");
						}
					},
					error : function() {
						self
						.onFail("A problem was encountered when computing facets.");
					}
				});

			} else {
				// log("colHeaders length is 0");
				/*
				 * Call the callback function using the array of column names/unique
				 * value objects.
				 */
				callback(colCountObj);
			}
		},

		/*
		 * sortColumnsByUniqueValue
		 * 
		 * Takes an array of column objects {name, unique value count} and creates a
		 * new array of just column names in order of their unique values.
		 * 
		 * Passes the array to the reordering operation.
		 */
		sortColumnsByUniqueValue : function(colCountObj) {

			var self = this;

			// log('colCountObj');
			// log(colCountObj);

			// Temp var for storing the highest unique value
			var highest = 0;
			// The new array of column names
			var columnHeadersByUniqueValue = [];

			var len = colCountObj.length;
			for ( var a = 0; a < len; a++) {
				if (colCountObj[a].count > highest) {
					columnHeadersByUniqueValue.splice(0, 0, colCountObj[a].name);
					highest = colCountObj[a].count;
				} else {
					columnHeadersByUniqueValue.splice(1, 0, colCountObj[a].name);
				}
			}

			log('Column headers by unique value: ' + columnHeadersByUniqueValue);

			self.reorderRows(columnHeadersByUniqueValue);
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
		 * 
		 * TODO : Issue with there not being an even number of unique value rows. A
		 * Java servlet will provide functionality to "add" any missing rows of data -
		 * essentially "filling" out the dataset with missing data dependent on the
		 * column the user has selected for transposing (headersCol).
		 */
		reorderRows : function(columnHeadersByUniqueValue) {

			log("reorderRows");

			var self = this;

			var sortingObject = {
					criteria : []
			};

			/*
			 * Create an array of sorting configurations, at the same time as
			 * checking the column exists in the column data.
			 */
			var columns = theProject.columnModel.columns;
			for ( var h = 0; h < columnHeadersByUniqueValue.length; h++) {
				for ( var i = 0; i < columns.length; i++) {
					if (columns[i].name == columnHeadersByUniqueValue[h]) {
						sortingObject.criteria.push({
							column : columns[i].name,
							valueType : "string",
							reverse : false,
							blankPosition : 2,
							errorPosition : 1,
							caseSensitive : false
						});
					}

				}
			}

			log('sortingObject:');
			log(sortingObject);

			/*
			 * Post a silent "reorder-rows" call - remembering to include the
			 * 'theProject' parameter.
			 */
			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "reorder-rows",
				data : {
					sorting : JSON.stringify(sortingObject)
				},
				success : function() {
					self.multiValueTranspose();
				},
				error : function() {
					self.onFail("A problem was encountered when reordering rows.");
				}
			});

		},

		/*
		 * multiValueTranspose
		 * 
		 * Before transposing rows, we need to know how many rows to transpose by -
		 * this number is equivalent to the number of unique values in the
		 * multi-valued column.
		 * 
		 * The facet functionality from before is used to get this number.
		 * 
		 * The labels of the unique values in the facet are also extracted and used
		 * as the new headers for renaming the new columns later on.
		 */
		multiValueTranspose : function() {

			var self = this;

			log("multiValueTranspose beginning");

			/*
			 * Create a facet parameter object using the global column name to
			 * transpose.
			 */
			var facetParams = {
					"facets" : [ {
						"type" : "list",
						"name" : self.vars.headersColName,
						"columnName" : self.vars.headersColName,
						"expression" : "value",
						"omitBlank" : false,
						"omitError" : false,
						"selection" : [],
						"selectBlank" : false,
						"selectError" : false,
						"invert" : false
					} ],
					"mode" : "row-based"
			};

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "compute-facets",
				data : {
					engine : JSON.stringify(facetParams)
				},
				success : function(data) {

					// log("data");
					// log(data);

					for ( var h = 0; h < data.facets.length; h++) {
						if (data.facets[h].columnName == self.vars.headersColName) {
							if (typeof data.facets[h].choices != 'undefined') {

								/*
								 * If there are less than 100 unique values
								 * in the column to transpose, store them as
								 * column names in an array to use to rename
								 * the newly transposed columns.
								 */
								for ( var i = 0; i < data.facets[h].choices.length; i++) {
									self.vars.newHeaders.push(data.facets[h].choices[i].v.l);
								}
							} else {
								/*
								 * If there are more than 100 unique values
								 * in the column to transpose, abort and
								 * tell the user they can't proceed with the
								 * wizard because they are trying to
								 * transpose too many rows to columns.
								 */
								log("Aborting rows to columns wizard - facet count limit reached.")
								self.vars.abortOperation = true;
							}
						}
					}

					/*
					 * If there was an issue with using the facet, abort,
					 * otherwise continue.
					 */
					if (!self.vars.abortOperation) {
						log("transposing...");
						/*
						 * Post a silent "transpose" call, performing a
						 * minor UI update as a callback, before proceeding
						 * the next operation.
						 */
						LG.silentProcessCall({
							type : "POST",
							url : "/command/" + "core" + "/"
							+ "transpose-rows-into-columns",
							data : {
								columnName : self.vars.valuesColName,
								rowCount : self.vars.newHeaders.length
							},
							success : function() {
								Refine.update({
									modelsChanged : true
								}, function() {
									self.removeBlankRows();
								});
							},
							error : function() {
								self
								.onFail("A problem was encountered when transposing rows.");
							}
						});
					} else {
						self
						.onFail("A problem was encountered when computing facets.\n\nThere are too many values being transposed. "
								+ "The maximum number of unique values (or rows) to transpose is 100");
					}
				},
				error : function() {
					self
					.onFail("A problem was encountered when computing facets.");
				}
			});

		},

		/*
		 * removeBlankRows
		 * 
		 * A large number of blank rows have been generated from the transpose which
		 * need to be removed.
		 * 
		 * Facet functionality is used again. By creating a facet on one of the new
		 * columns using the "isBlank" expression, the data table is updated to show
		 * only the blank rows which are to be removed.
		 * 
		 * Because the facet generated will only display "true" and "false" choices,
		 * there's no worry of the facet count limit being reached.
		 */
		removeBlankRows : function() {

			var self = this;

			/*
			 * It doesn't seem possible to use the facet functionality
			 * "behind-the-scenes" for this particular operation. We need to
			 * actually update the data table, so a facet has to be added to the UI.
			 */
			ui.browsingEngine.addFacet("list", {
				"name" : self.vars.valuesColName + " 1",
				"columnName" : self.vars.valuesColName + " 1",
				"expression" : "isBlank(value)"
			});

			var facets = ui.browsingEngine._facets;
			// For each possible facet on the screen
			for ( var i = 0; i < facets.length; i++) {

				log(facets[i].facet._config.columnName);

				// Find the facet that we have just created.
				// The first of the transposed columns will not have the same name
				// as the value stored in the column we the user selected to
				// transpose.
				if (facets[i].facet._config.columnName == self.vars.valuesColName + " 1") {

					// Store the facet so we can remove it later
					var blankFacet = facets[i].facet;

					// Check that the facet UI has been created using an interval
					// TODO: Try to remove the use of an interval.
					var myInterval = setInterval(
							function() {
								if (blankFacet._data != null) {

									// Check to see if there are both true and false
									// values
									// The only case where there would be one "true"
									// or "false"
									// value, is where only a single value was
									// transposed.
									// E.g. "electricity" as opposed to
									// "electricity, gas, heat".
									if (blankFacet._data.choices.length > 1) {

										// Find the "true" value
										for ( var j = 0; j < blankFacet._data.choices.length; j++) {
											if (blankFacet._data.choices[j].v.l === "true") {

												// Invoke a selection action on that
												// facet choice
												blankFacet._selection
												.push(blankFacet._data.choices[j]);

												// Remove the matching rows
												// Have to use the postCoreProcess
												// function here as
												// the rows are removed using
												// Refine's facet-list JSON object
												Refine
												.postCoreProcess(
														"remove-rows",
														{},
														null,
														{
															rowMetadataChanged : true
														},
														{
															onDone : function() {
																// Pass
																// boolean
																// "true" if
																// multi-values
																// are
																// transposed.
																self.getNewColumnHeaders(
																		blankFacet,
																		true);
															}
														});
											}
										}
									} else {
										// Only one choice, must have been a single
										// value type,
										// so no rows to remove.
										// Pass a count of 0 if a single value is
										// transposed
										self.getNewColumnHeaders(blankFacet, false);
									}
									clearInterval(myInterval);
								} else {
									// wait for facet UI to complete creation
									log("Blank facet isn't set up yet, waiting 1 second...");
								}
							}, 1000);
				}
			}
		},

		/*
		 * getNewColumnHeaders
		 * 
		 * Creates an array with the names of the newly created columns in, which is
		 * then passed to the renameMultipleColumns function so they can be renamed
		 * using the unique values in the "headers" column.
		 */
		getNewColumnHeaders : function(blankFacet, multiValues) {

			var self = this;

			/*
			 * Remove the "isBlank" facet to bring the remaning rows back into view.
			 */
			ui.browsingEngine.removeFacet(blankFacet);

			/*
			 * Perform a UI update to make sure the rows have reappeared.
			 * 
			 * Create an array of old column names. Refine suffixes an int beginning
			 * at '1' for each transposed column.
			 */
			Refine.update({
				everythingChanged : true
			}, function() {

				var oldHeaders = [];
				var columns = theProject.columnModel.columns;
				// Refine adds incremental int's to newly created columns with the
				// same
				// name.
				var count = 1;
				for ( var k = 0; k < columns.length; k++) {
					if (multiValues) {
						if (columns[k].name == self.vars.valuesColName + " "
								+ count) {
							oldHeaders.push(columns[k].name);
							count++;
						}
					} else {
						if (columns[k].name == self.vars.valuesColName + " 1") {
							oldHeaders.push(columns[k].name);
							k = columns.length;
						}
					}
				}

				/*
				 * Sort the array of new header names (unique values from the
				 * headers column), so they map correctly to the newly created
				 * transposed columns (which were sorted into alphabetical order
				 * during the sort operation).
				 */
				self.vars.newHeaders.sort();

				self.renameMultipleColumns(oldHeaders, self.vars.newHeaders);
			});
		},

		/*
		 * renameMultipleColumns
		 * 
		 * Recursive function that takes two arrays as parameters. One array for the
		 * old column names, and the second array for the new column names.
		 * 
		 */
		renameMultipleColumns : function(oldNames, newNames) {

			var self = this;

			// log('oldNames');
			// log(oldNames);
			// log('newNames');
			// log(newNames);

			/*
			 * If there are still column names to rename
			 */
			if (oldNames.length > 0 && newNames.length > 0) {

				/*
				 * Post a silent "rename" call
				 */
				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "rename-column",
					data : {
						oldColumnName : oldNames[0],
						newColumnName : newNames[0]
					},
					success : function() {
						/*
						 * Removes the two column names that have just been
						 * used from the arrays.
						 */
						oldNames.splice(0, 1);
						newNames.splice(0, 1);
						/*
						 * Check if those were the last values in the
						 * arrays, if so, proceed to the next operation,
						 * otherwise, recurse.
						 */
						if (oldNames.length > 0 && newNames.length > 0) {
							self.renameMultipleColumns(oldNames, newNames);
						} else {
							self.removeHeadersColumn();
						}
					},
					error : function() {
						self
						.onFail("A problem was encountered when renaming the column: \""
								+ oldNames[0]
								+ "\" to \""
								+ newNames[0] + "\".");
					}
				});

			} else {
				log("No more columns to rename");
			}
		},

		/*
		 * removeHeadersColumn
		 * 
		 * Removes the column containing the values for the new column headers.
		 */
		removeHeadersColumn : function() {

			var self = this;

			log("removeHeadersColumn");

			/*
			 * Post a silent "remove-column" call.
			 */
			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "remove-column",
				data : {
					columnName : self.vars.headersColName
				},
				success : function() {
					self.onComplete();
				},
				error : function() {
					self
					.onFail("A problem was encountered when removing the column: \""
							+ self.vars.headersColName + "\".");
				}
			});
		},

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {
			var self = this;
			LG.ops.setBlanksToNulls(false, theProject.columnModel.columns, 0, function() {
				alert("Rows to columns wizard failed. \n\n" + message);
				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.rowsToColumnsBody);
				LG.showWizardProgress(false);
			});

		},

		/*
		 * onComplete
		 * 
		 * Sets any null cells back to being blank, dismisses any "Working..."
		 * messages, resets the facet count limit and performs an update.
		 */
		onComplete : function() {

			var self = this;

			LG.ops.setBlanksToNulls(false, theProject.columnModel.columns, 0, function() {
				DialogSystem.dismissAll();
				// LG.setFacetCountLimit(100);
				Refine.update({
					everythingChanged : true
				});
				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.rowsToColumnsBody);
				LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.rowsToColumnsBody);
				LG.showWizardProgress(false);
			});

			return false;
		}

};
