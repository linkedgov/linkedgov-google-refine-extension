
/*
 * multipleColumnsWizard
 * 
 * Rotates columns to rows (i.e. 24 columns labelled by the hour, rotated into
 * one column named "Time" with 24 values per every original row).
 * 
 * The user is asked to select the range of columns to rotate, from that the
 * following parameters are passed to the wizard:
 * 
 * a) startColName - The column name at the start of the range of columns b)
 * colCount - The number of columns in the range c) newColName - The name for
 * the new column (input by user)
 * 
 * 
 * Operation steps:
 * 
 * 1. initialise() Store global variables, set facet limit and check for blank
 * cells before beginning the operation.
 * 
 * 2. reorderColumns() If there are any gaps in the range of columns, we move
 * the columns to skip to the beginning of the range before transposing.
 * 
 * 3. transposeColumns() Transposes the range of column headers into one column,
 * with each cell using the global LinkedGov 'separator' variable and each
 * column's value.
 * 
 * 4. splitColumns() Splits the newly created column into two columns using the
 * global LinkedGov 'separator' variable.
 * 
 * 5. fillDownColumns() Fills in all the blank cells as a result of the rotate.
 * 
 */
var multipleColumnsWizard = {

		vars : {
			startColName : "",
			newColName : "",
			colCount : 0,
			gapInRange : false,
			colsToSkip : [],
			elmts : {}
		},

		/*
		 * initialise
		 * 
		 * Fills any blank cells with null values before beginning the rotate
		 * operation.
		 */
		initialise : function(elmts) {

			var self = this;
			self.vars.elmts = elmts;

			if ($(elmts.multipleColumnsColumns).children("li").length > 0) {

				log("Starting multipleColumnsWizard");

				LinkedGov.showWizardProgress(true);

				/*
				 * Recalculate which columns are going to be transposed, taking into
				 * account any columns the user wants to skip.
				 */
				self.checkSkippedColumns();
				
				/*
				 * Remove all RDF relating to the columns involved in the rotation 
				 * operation as this will break their mappings.
				 */
				$(elmts.multipleColumnsColumns).children("li").find("span.col").each(function(){
					//log("Removing RDF for: "+$(this).html());
					LinkedGov.removeColumnInRDF($(this).html());
				});
				
				/*
				 * Set any blank cells to null to protect them from being filled
				 * down into after the transpose operation (which produces blank
				 * cells).
				 * 
				 * Passing self.transpose() as a parameter calls it immediately for
				 * some reason.
				 */
				LinkedGov.setBlanksToNulls(true,theProject.columnModel.columns,0,function() {
							/*
							 * If a gap has been detected, reorder the
							 * columns first.
							 */
							if (self.vars.gapInRange) {
								self.reorderColumns(Refine.columnNameToColumnIndex(self.vars.startColName),function() {
											self.transposeColumns();
										});
							} else {
								self.transposeColumns();
							}
						});

			} else {
				alert("You need to select a column to start from and a column to end at.\n\n"
						+ "If you need to unselect any column inbetween those columns, you can remove "
						+ "them from the list by clicking the red cross to the right of the column name.")
			}

		},

		/*
		 * Recalculates the parameters for the transpose process such as how many
		 * columns to transpose, the start index and any columns to skip.
		 */
		checkSkippedColumns : function() {

			var self = this;
			var elmts = self.vars.elmts;

			log("Before:");
			log($(elmts.multipleColumnsColumns).children("li"));

			/*
			 * Loop through the user's selected columns and trim any columns that
			 * have been marked as "skip" from the beginning and end.
			 */
			for ( var i = 0; i < $(elmts.multipleColumnsColumns).children("li").length; i++) {
				/*
				 * If a selected column has been removed, but was at the beginning,
				 * remove it from the array of columns.
				 */
				if ($($(elmts.multipleColumnsColumns).children("li")[i]).hasClass(
				"skip")
				&& i == 0) {
					$($(elmts.multipleColumnsColumns).children("li")[i]).remove();
					i--;
					/*
					 * If a selected column has been removed, but was at the end,
					 * remove it from the array of columns.
					 */
				} else if ($($(elmts.multipleColumnsColumns).children("li")[i])
						.hasClass("skip")
						&& i == $(elmts.multipleColumnsColumns).children("li").length - 1) {
					$($(elmts.multipleColumnsColumns).children("li")[i]).remove();
					i--;
					i--;
				}
			}
			log("After:");
			log($(elmts.multipleColumnsColumns).children("li"));

			/*
			 * Once trimmed, the array should only contain columns to skip after and
			 * before the start and end columns, so reassess which columns need to
			 * be skipped and populate the "colsToSkip" array.
			 */
			for ( var j = 0, len = $(elmts.multipleColumnsColumns).children("li").length; j < len; j++) {
				if ($($(elmts.multipleColumnsColumns).children("li")[j]).hasClass("skip")) {
					self.vars.colsToSkip.push($($(elmts.multipleColumnsColumns).children("li")[j]).find("span.col").html());
					self.vars.gapInRange = true;
				}
			}

			log("colsToSkip:");
			log(self.vars.colsToSkip);

			/*
			 * Recalculate how many columns to transpose.
			 */
			self.vars.startColName = $(elmts.multipleColumnsColumns).children("li").eq(0).find("span.col").html();
			self.vars.colCount = $(elmts.multipleColumnsColumns).children("li").length  - self.vars.colsToSkip.length;
			self.vars.newColName = window.prompt("New column name:", "");
		},

		/*
		 * reorderColumns
		 * 
		 * Recursive function.
		 * 
		 * In case there is a gap in the range of columns selected, the columns will
		 * have to be reordered before the transpose can begin.
		 * 
		 * Takes the index to start moving the columns to and a callback to call
		 * once complete.
		 * 
		 * Once complete, this should result in all "skipped" columns appearing to
		 * the left of the columns to transpose.
		 */
		reorderColumns : function(colIndex, callback) {

			var self = this;

			// log("reorderColumns");

			if (self.vars.colsToSkip.length > 0) {

				LinkedGov
				.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "move-column",
					data : {
						columnName : self.vars.colsToSkip[0],
						index : colIndex,
					},
					success : function() {
						/*
						 * Increment the index to move the next column to.
						 * Remove the column that's just been moved from the
						 * "colsToSkip" array. Recurse.
						 */
						colIndex = colIndex + 1;
						self.vars.colsToSkip.splice(0, 1);
						self.reorderColumns(colIndex, callback);
					},
					error : function() {
						self
						.onFail("A problem was encountered when reordering the columns.");
					}
				});

			} else {
				/*
				 * Perform a model UI update (when columns change) and proceed to
				 * the next operation.
				 */
				Refine.update({
					modelsChanged : true
				}, callback);
			}
		},

		/*
		 * transposeColumns
		 * 
		 * Create a transpose config object using the wizard's global column name
		 * variables and posts it to Refine.
		 * 
		 */
		transposeColumns : function() {

			log("transposeColumns");

			var self = this;

			/*
			 * Instead of using Refine.postCoreProcess(), we post the transpose
			 * process as a more silent "AJAX" call without the default UI update
			 * callbacks.
			 */
			LinkedGov
			.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/"
				+ "transpose-columns-into-rows",
				data : {
					startColumnName : self.vars.startColName,
					columnCount : self.vars.colCount,
					combinedColumnName : self.vars.newColName,
					prependColumnName : true,
					separator : LinkedGov.vars.separator,
					ignoreBlankCells : true
				},
				success : function() {
					/*
					 * Perform a silent UI update before calling the next
					 * operation.
					 */
					Refine.reinitializeProjectData(function() {
						ui.dataTableView.update(function() {
							ui.browsingEngine.update(self.splitColumns());
						});
					});
				},
				error : function() {
					self
					.onFail("A problem was encountered when transposing the columns.");
				}
			});

		},

		/*
		 * splitColumns
		 * 
		 * Splits the newly created column using the global LinkedGov separator.
		 */
		splitColumns : function() {

			log("splitColumns");

			var self = this;

			/*
			 * Post a silent "split-column" process call (without the default UI
			 * update callbacks).
			 * 
			 * After splitting the columns, the transpose has left us with lots of
			 * blank cells which need to be filled down.
			 */

			LinkedGov
			.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "split-column",
				data : {
					columnName : self.vars.newColName,
					mode : "separator",
					separator : LinkedGov.vars.separator,
					guessCellType : true,
					removeOriginalColumn : true,
					regex : false
				},
				success : function() {
					Refine.update({
						modelsChanged : true
					}, function() {
						self.fillDownColumns(
								theProject.columnModel.columns, 0);
					});
				},
				error : function() {
					self
					.onFail("A problem was encountered when splitting the columns.");
				}
			});

		},

		/*
		 * fillDownColumns
		 * 
		 * A recursive function that takes the column model's list of columns and an
		 * iterator as parameters.
		 * 
		 * Only fills a column if it's name is not equal to the columns being
		 * operated on. The column suffixes +" 1" and +" 2" are always the same
		 * after a column split.
		 * 
		 */
		fillDownColumns : function(columns, i) {

			var self = this;

			// log("fillDownColumns");
			// log(i);
			// log(columns);
			// log("-----------------------------");

			if (i < columns.length) {

				// log("columns[i].name: "+columns[i].name);
				// log("self.vars.newColName: "+self.vars.newColName);

				if (columns[i].name != self.vars.newColName
						&& columns[i].name != self.vars.newColName + " 1"
						&& columns[i].name != self.vars.newColName + " 2") {

					LinkedGov
					.silentProcessCall({
						type : "POST",
						url : "/command/" + "core" + "/" + "fill-down",
						data : {
							columnName : columns[i].name
						},
						success : function() {
							i = i + 1;
							self.fillDownColumns(columns, i);
						},
						error : function() {
							self
							.onFail("A problem was encountered when filling-down the columns.");
						}
					});

				} else {
					i = i + 1;
					self.fillDownColumns(columns, i);
				}
			} else {
				log("filDownColumns complete, i = " + i);
				self.onComplete();
			}

		},

		onFail : function(message) {
			var self = this;
			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LinkedGov.setBlanksToNulls(false, theProject.columnModel.columns, 0,
					function() {
				log("Multiple columns wizard failed.\n\n" + message);
				Refine.update({
					everythingChanged : true
				});
				LinkedGov.resetWizard(self.vars.elmts.multipleColumnsBody);
				LinkedGov.showWizardProgress(false);
			});
		},

		/*
		 * onComplete
		 * 
		 * Sets any null values back to blank and performs a full update.
		 */
		onComplete : function() {

			var self = this;

			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LinkedGov.setBlanksToNulls(false, theProject.columnModel.columns, 0, function() {
				
				log("Multiple columns wizard complete");
				Refine.update({everythingChanged:true},function(){
					// Refresh the content of the select inputs
					ui.typingPanel.rangeSelector($(self.vars.elmts.multipleColumnsBody).find("div.range").find("select").eq(0));
					ui.typingPanel.populateRangeSelector($(self.vars.elmts.multipleColumnsBody).find("div.range"), function(){
						$(self.vars.elmts.multipleColumnsBody).find("div.range").slideDown();					
						LinkedGov.resetWizard(self.vars.elmts.multipleColumnsBody);
						LinkedGov.showWizardProgress(false);
					});
				});

			});

			return false;
		}

};
