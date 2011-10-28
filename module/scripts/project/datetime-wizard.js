/*
 * dateTimeWizard
 * 
 * TODO: When producing RDF or exporting the dates into any format, Refine's
 * "date" object doesn't output as a string correctly.
 * 
 * simpleDate
 * 
 * fragmentedDate
 * 
 * simpleTime
 * 
 * fragmentedTime
 * 
 * buildExpression
 * 
 */
LinkedGov.dateTimeWizard = {

		/*
		 * colObjects - contains data for each selected column such as their name,
		 * their options and their RDF.
		 */
		vars : {
			columns : [],
			colFragments : [],
			colObjects : [],
			elmts : {},
			vocabs : {
				time : {
					curie : "time",
					uri : "http://www.w3.org/2006/time#"
				},
				lg : {
					curie: "lg",
					uri : LinkedGov.vars.lgNameSpace
				}
			}
		},

		/*
		 * initialise
		 * 
		 * 
		 */
		initialise : function(elmts) {

			// log("here");
			// log(elmts);

			var self = this;
			var error = false;
			self.vars.elmts = elmts;
			self.vars.columns = [];
			self.vars.colFragments = [];

			if (elmts.dateTimeColumns.children("li").length > 0) {

				/*
				 * Remove any skipped columns or columns that have no date fragments
				 * specified.
				 */
				self.vars.elmts.dateTimeColumns.children("li").each(
						function() {
							if ($(this).hasClass("skip")) {
								$(this).remove();
							} else {
								var checkedInputs = $(this).find("input:checked");
								if (checkedInputs.length < 1) {
									alert("You haven't specified what date or time part is contained in the \""
											+ $(this).find("span.col").html() + "\" column");
									error = true;
								}
							}
						});

				if (!error) {
					LinkedGov.showWizardProgress(true);
					self.buildColumnObjects();
				} else {
					return false;
				}
			} else {
				alert("You need to select one or more columns that contain a date, time or both.");
			}

		},

		/*
		 * buildColumnObjects
		 * 
		 * Construct an array of objects containing the selected columns, their
		 * combinations, options and RDF.
		 *  [{ name:col1, combi:"h-m-s", durationRDF:{...} },{ name:col2,
		 * combi:"DD-MM-YYYY", dateTimeRDF:{...} }]
		 */
		buildColumnObjects : function() {

			/*
			 * Loop through each selected column and check for date fragments
			 * starting with the largest fragment first (i.e. Y,M,D,h,m,s).
			 * 
			 * We concatenate each date fragment into a string and then test whether
			 * the fragments resemble a valid date or time.
			 * 
			 */
			var self = this;

			var cols = self.vars.elmts.dateTimeColumns.children("li");
			var value = "";
			var frags = [ 'Y', 'M', 'D', 'h', 'm', 's' ];

			var colObjects = [];

			/*
			 * Loop through the selected columns and store their fragments and
			 * options.
			 */
			for ( var i = 0; i < cols.length; i++) {
				/*
				 * Loop through their checked date fragments
				 */
				var checkedInputs = cols.eq(i).children("span.dateFrags").children('input:checked');

				for ( var j = 0; j < checkedInputs.length; j++) {
					value += checkedInputs.eq(j).val() + "-";
				}
				value = value.substring(0, value.length - 1);

				/*
				 * Store the values of the column options such as: - Month before
				 * day - Duration & duration value - Day and Year
				 */
				var colOptions = {};

				colOptions.name = cols.eq(i).find('span.col').html();
				colOptions.combi = value;
				colOptions.monthBeforeDay = cols.eq(i).children("span.mb4d").find('input.mb4d').attr('checked');

				// Store duration information
				if (cols.eq(i).children("span.duration").find('input.duration').attr('checked') && 
						cols.eq(i).children("span.duration").find('div.duration-input').find("input.duration-value").val().length > 0) {
					colOptions.durationValue = cols.eq(i).children("span.duration")
					.find('div.duration-input')
					.find("input.duration-value")
					.val();
					colOptions.durationUnit = cols.eq(i).children("span.duration")
					.find('div.duration-input')
					.find("select.duration")
					.val();
				}
				// Store year information
				if (value.indexOf("Y") < 0
						&& cols.eq(i).children("span.year").find('input.year').val().length > 0) {
					colOptions.year = cols.eq(i).children("span.year").find('input.year').val();
				}
				// Store day information
				if (value.indexOf("D") < 0
						&& cols.eq(i).children("span.day").find('input.day').val().length > 0) {
					colOptions.day = cols.eq(i).children("span.day").find('input.day').val();
				}

				log("colOptions");
				log(colOptions);

				colObjects.push(colOptions);

				value = "";

			} // end for

			self.vars.colObjects = colObjects;

			log("self.vars.colObjects");
			log(self.vars.colObjects);

			self.checkForMultiColumnDateTimes(function() {
				self.checkCombinations(function() {
					LinkedGov.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
						self.saveRDF(rootNode, foundRootNode);
					});
				});
			});

		},

		/*
		 * checkForMultiColumnDateTimes
		 */
		checkForMultiColumnDateTimes : function(callback) {

			var self = this;
			var colObjects = self.vars.colObjects;

			/*
			 * Check for the 3 simplest combinations that have every fragment in a
			 * different column:
			 * 
			 * Y/M/D, h/m/s, and Y/M/D/h/m/s
			 */
			if (colObjects.length == 3) {

				/*
				 * Check for a simple day, month, year combination
				 */
				if (colObjects[0].combi == "Y" || colObjects[0].combi == "M" || colObjects[0].combi == "D") {
					var fragCount = 0;
					var frags = [ 'D', 'M', 'Y' ];
					var colArray = [];
					for ( var i = 0; i < colObjects.length; i++) {
						if (colObjects[i].combi == frags[fragCount]) {
							colArray.push(colObjects[i].name);
							fragCount++;
							i = -1;
							if (fragCount == frags.length) {
								// We have a year, month and day
								log("We have year, month and day across three columns.");

								/*
								 * Merge the multiple columns into one and create an
								 * object for it in the colObjects array.
								 */
								self.createSingleColumnDate(colArray, "Y-M-D", callback);

							}
						}
					}
				} else {
					/*
					 * Check for a simple hours, minutes, seconds combination
					 */
					var fragCount = 0;
					var frags = [ 'h', 'm', 's' ];
					var colArray = [];
					for ( var i = 0; i < colObjects.length; i++) {
						/*
						 * TODO: need to loop through the frags here as the h-m-s
						 * could be in any order in the column list.
						 */
						if (colObjects[i].combi == frags[fragCount]) {
							colArray.push(colObjects[i].name);
							fragCount++;
							i = -1;
							if (fragCount == frags.length) {
								// We have hours, minutes and seconds
								log("We have hours, minutes and seconds across three columns");
								/*
								 * Create a new column with the combined date
								 * fragments, then type it as a date within Refine.
								 */
								self.createSingleColumnDate(colArray, "h-m-s", callback);
							}
						}
					}
				}
			} else if (colObjects.length == 2) {

				/*
				 * If we have Y-M-D selected, check if we have h-m or h-m-s selected
				 * 
				 */
				for ( var a = 0; a < colObjects.length; a++) {
					if (colObjects[a].combi == "Y-M-D") {
						var colArray = [ colObjects[a].name ];
						for ( var i = 0; i < colObjects.length; i++) {
							if (colObjects[i].combi == "h-m") {
								colArray.push(colObjects[i].name);
								log("We have a year, month, day, hours and minutes spread across two columns");
								self.createSingleColumnDate(colArray, "Y-M-D-h-m", callback);
							} else if (colObjects[i].combi == "h-m-s") {
								colArray.push(colObjects[i].name);
								log("We have a year, month, day, hours, minutes and seconds spread across two columns");
								self.createSingleColumnDate(colArray, "Y-M-D-h-m-s", callback);
							}
						}
					}
				}

			} else if (colObjects.length == 6) {

				/*
				 * Check for a full house
				 */
				var fragCount = 0;
				var frags = [ 'D', 'M', 'Y', 'h', 'm', 's' ];
				var colArray = [];
				for ( var i = 0; i < colObjects.length; i++) {
					if (colObjects[i].combi == frags[fragCount]) {
						colArray.push(colObjects[i].name);
						fragCount++;
						i = -1;
						if (fragCount == frags.length) {
							// We have years, months, days, hours, minutes and
							// seconds
							log("We have a year, month, day, hours, minutes and seconds spread across six columns");

							self.createSingleColumnDate(colArray, "Y-M-D-h-m-s",callback);
						}
					}
				}
			} else {
				callback();
			}
		},

		/*
		 * createSingleColumnDate
		 * 
		 * If we have a full date across a number of columns, we want to create a
		 * new column in Refine and type it as a proper date (ISO/XSD).
		 * 
		 * We then remove any of the columns used in creating the new column from
		 * the column object array, and insert the new column (and it's options)
		 * into the column object array.
		 */
		createSingleColumnDate : function(cols, com, callback) {

			var self = this;

			// log("createSingleColumnDate, self.vars.colObjects.length before:");
			// log(self.vars.colObjects.length);

			var self = this;
			var expr = "";
			var newName = "";

			/*
			 * Build the expression used to create the new date as well as create
			 * the new column name using the previous columns names.
			 */
			for ( var i = 0; i < cols.length; i++) {
				expr += 'cells["' + cols[i] + '"].value+"-"+';
				newName += cols[i] + "-";
			}

			/*
			 * Remove the tails of the strings
			 */
			expr = expr.substring(0, expr.length - 5);
			newName = newName.substring(0, newName.length - 1);

			/*
			 * Remove the columns used to create the new column
			 */
			for ( var i = 0; i < self.vars.colObjects.length; i++) {
				for ( var j = 0; j < cols.length; j++) {
					if (self.vars.colObjects[i].name == cols[j]) {
						log("Removing '" + self.vars.colObjects[i].name + "' from the colObjects array");
						self.vars.colObjects.splice(i, 1);
						i = -1;
						j = cols.length;
					}
				}
			}

			/*
			 * Try creating the new column with the new name, if an error is thrown,
			 * then add (LG) to that column name to avoid a name clash.
			 */
			try {
				Refine.postCoreProcess("add-column", {
					baseColumnName : cols[0],
					expression : expr,
					newColumnName : newName,
					columnInsertIndex : Refine.columnNameToColumnIndex(cols[0]) + cols.length,
					onError : "keep-original"
				}, null, {
					modelsChanged : true
				}, {
					onDone : function() {
						/*
						 * Create the column object for the new column
						 */
						self.vars.colObjects.push({
							name : newName,
							combi : com,
							monthBeforeDay : false
						});

						log("createSingleColumnDate, self.vars.colObjects after:");
						log(self.vars.colObjects);

						callback();
					}
				});
			} catch (e) {
				log("Error: dateTimeWizard: createNewColumn()");
				log(e);
				alert("A column already exists with the name "
						+ newName
						+ ", \"(LG)\" has been appended to the column name for now.");
				Refine.postCoreProcess("add-column", {
					baseColumnName : cols[0],
					expression : expr,
					newColumnName : newName + " (LG)",
					columnInsertIndex : Refine.columnNameToColumnIndex(cols[0])
					+ cols.length,
					onError : "keep-original"
				}, null, {
					modelsChanged : true
				}, {
					onDone : function() {
						/*
						 * Create the column object for the new column
						 */
						self.vars.colObjects.push({
							name : newName + " (LG)",
							combi : com,
							monthBeforeDay : false
						});

						log("createSingleColumnDate, self.vars.colObjects after:");
						log(self.vars.colObjects);

						callback();

					}
				});
			}

		},

		/*
		 * checkCombinations
		 * 
		 * Check the combination strings for the columns and decide what action to
		 * take.
		 * 
		 * toDate(value,boolean) - boolean signals whether the day is before the
		 * month.
		 */
		checkCombinations : function(callback) {

			var self = this;
			var colObjects = self.vars.colObjects;
			//log("checkCombinations");
			//log(colObjects.length);

			/*
			 * If the number of selected columns is not 3 or 6, loop through the
			 * array of column objects and check their invidual fragment
			 * combinations as well as their date options.
			 * 
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				//log("colObjects[i].combi: " + colObjects[i].combi)

				if(colObjects[i].combi.length > 0) {
					/*
					 * Any date/time that includes a year, day and month can be typed
					 * within Refine as a date.
					 */
					switch (colObjects[i].combi) {

					case "Y-M-D":
						// Format and type as an XSD date
						self.formatDateInRefine(colObjects[i]);
						colObjects[i].rdf = self.makeXSDDateTimeFragment(colObjects[i]);
						break;
					case "Y-M-D-h":
						// Format and create gregorian DGUK URI
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}
						break;
					case "Y-M-D-h-m":
						// Format and create gregorian DGUK URI
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}					
						break;
					case "Y-M-D-h-m-s":
						// Format and create gregorian DGUK URI
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}					
						break;
					default:
						// All other combinations
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeIntervalFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeInstantFragment(colObjects[i]);
						}	
					break;

					} // end switch

					/*
					 * TODO: Handle the day and year inputs
					 */
					/*
					if (typeof colObjects[i].year != 'undefined') {
						// makeYearFragment
						colObjects[i].yearRDF = self.makeYearFragment(colObjects[i].year);
					}

					if (typeof colObjects[i].day != 'undefined') {
						// makeDayFragment
						colObjects[i].dayRDF = self.makeDayFragment(colObjects[i].day);
					}

					 */
					
					if (i == colObjects.length - 1) {
						callback();
					}
					
				} else {
					alert("Sorry, the date combination you specified for the column: \""+colObjects[i].name+"\" cannot be processed.");
				}

			} // end for

		},

		/*
		 * formatDateInRefine
		 * 
		 * Posts a silent text-transform process call (i.e. without a noticeable UI
		 * update)
		 */
		formatDateInRefine : function(colObject) {

			var self = this;
			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;

			LinkedGov.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "text-transform",
				data : {
					columnName : colName,
					expression : 'toDate(value, ' + (mb4d) + ')',
					repeat : false,
					repeatCount : ""
				},
				success : function() {
					Refine.update({cellsChanged : true});
				},
				error : function() {
					self.onFail("A problem was encountered when performing a text transform on the column: \""+ colName + "\".");
				}
			});

		},

		/*
		 * Takes a column name and a combination string.
		 * e.g. "Y-M-D-h-m-s"
		 * 
		 */
		makeInstantFragment:function(colObject){

			var self = this;
			
			var colName = colObject.name;
			var combi = colObject.combi;
			var camelColName = LinkedGov.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-blank",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[{
							"uri":"http://www.w3.org/2006/time#Instant",
							"curie":"time:Instant"
					    }],
						"links":[]
					}
			};

			var combiArray = combi.split("-");

			for(var i=0; i<combiArray.length; i++){

				var fragName = "";

				switch(combiArray[i]){

				case "Y" :
					fragName = "year";
					break;
				case "M" :
					fragName = "month";
					break;
				case "D" :
					fragName = "day";
					break;
				case "h" :
					fragName = "hour";
					break;
				case "m" :
					fragName = "minute";
					break;
				case "s" :
					fragName = "second";
					break;
				default :
					break;

				}

				o.target.links.push({
					"uri":"http://www.w3.org/2006/time#"+fragName,
					"curie":"time:"+fragName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value.split(\":\")["+i+"]",
						"valueType":"http://www.w3.org/2001/XMLSchema#int",
						"columnName":colName,
						"isRowNumberCell":false
					}
				});
			}

			return o;
		},


		/*
		 * Takes a column name and a combination string.
		 * e.g. "Y-M-D-h-m-s"
		 * 
		 */
		makeIntervalFragment:function(colObject){

			var self = this;

			var colName = colObject.name;
			var combi = colObject.combi;
			var camelColName = LinkedGov.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-blank",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[{
							"uri":"http://www.w3.org/2006/time#Interval",
							"curie":"time:Interval"
						}],
						"links":[]
					}
			};

			var combiArray = combi.split("-");

			for(var i=0; i<combiArray.length; i++){

				var fragName = "";

				switch(combiArray[i]){

				case "Y" :
					fragName = "years";
					break;
				case "M" :
					fragName = "months";
					break;
				case "D" :
					fragName = "days";
					break;
				case "h" :
					fragName = "hours";
					break;
				case "m" :
					fragName = "minutes";
					break;
				case "s" :
					fragName = "seconds";
					break;
				default :
					break;

				}

				o.target.links.push({
					"uri":"http://www.w3.org/2006/time#"+fragName,
					"curie":"time:"+fragName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value.split(\":\")["+i+"]",
						"valueType":"http://www.w3.org/2001/XMLSchema#int",
						"columnName":colName,
						"isRowNumberCell":false
					}
				});
			}

			return o;
		},

		makeXSDDateFragment:function(colObject){

			var self = this;

			log("makeXSDDateFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LinkedGov.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")",
						"valueType":"http://www.w3.org/2001/XMLSchema#date",
						"columnName":colName,
						"isRowNumberCell":false
					}
			};

			return o;
		},

		/*
		 * 
		 */
		makeXSDDateTimeFragment:function(colObject){

			var self = this;

			log("makeXSDDateTimeFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LinkedGov.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")+\"T\"+value.toDate("+mb4d+").toString(\"HH-mm-ss\")",
						"valueType":"http://www.w3.org/2001/XMLSchema#dateTime",
						"columnName":colName,
						"isRowNumberCell":false
					}
			};

			return o;
			
		},


		/*
		 * Note: Might not need to use value.toDate() first.
		 */
		makeXSDDateTimeInstantURIFragment:function(colObject){

			var self = this;

			log("makeXSDDateTimeInstantURIFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LinkedGov.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"\"http://reference.data.gov.uk/doc/gregorian-instant/\"+value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")+\"T\"+value.toDate("+mb4d+").toString(\"HH:mm:ss\")",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[],
						"links":[]
					}
			};

			return o;

		},

		/*
		 * Note: Might not need to use value.toDate() first.
		 */
		makeXSDDateTimeIntervalURIFragment:function(colObject){

			var self = this;

			log("makeXSDDateTimeIntervalURIFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LinkedGov.camelize(colName);	
			var unit = colObject.durationUnit;
			var value = colObject.durationValue;

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"\"http://reference.data.gov.uk/doc/gregorian-interval/\"+value.toDate(false).toString(\"yyyy-MM-dd\")+\"T\"+value.toDate(false).toString(\"HH:mm:ss\")",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[],
						"links":[]
					}
			};


			var durationCode = "";
			/*
			 * TODO: Duration only allows Years - Minutes, so need to remove
			 * seconds. TODO: Should just use Y,M,D for the unit values in the
			 * select dropdown in the wizard. TODO: What if the duration is 1 hour,
			 * 30 minutes.
			 */
			switch (unit) {
			case "years":
				durationCode = "/P" + value + "Y0M0DT0H0M"
				break;
			case "months":
				durationCode = "/P0Y" + value + "M0DT0H0M"
				break;
			case "days":
				durationCode = "/P0Y0M" + value + "DT0H0M"
				break;
			case "hours":
				durationCode = "/P0Y0M0DT" + value + "H0M"
				break;
			case "minutes":
				durationCode = "/P0Y0M0DT0H" + value + "M"
				break;
			default:
				break;
			}
			durationCode = "+\""+durationCode+"\"";
			o.target.expression = o.target.expression + durationCode;

			return o;

		},

		/*
		 * saveRDF
		 * 
		 * Loop through the column objects, check if they have any existing entries
		 * and store their RDF accordingly.
		 * 
		 */
		saveRDF : function(rootNode, newRootNode) {

			log("saveRDF");
			log(rootNode);

			var self = this;

			var colObjects = self.vars.colObjects;

			/*
			 * Begin to loop through the column objects and store their appropriate
			 * RDF.
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				/*
				 * Loop through the rootNode's "links" - or property-value entries,
				 * and try to find an existing entry for the column that we're
				 * storing information for and remove it.
				 */

				var links = rootNode.links;

				for ( var j = 0; j < links.length; j++) {

					/*
					 * TODO: Can there be multiple targets for a link?
					 */
					if (typeof links[j].target != 'undefined' && links[j].target.columnName == colObjects[i].name) {
						/*
						 * Found existing RDF for the column, so remove it.
						 */
						log("Found date-time RDF data for column: \"" + colObjects[i].name + "\", removing ...");
						links.splice(j, 1);
						j--;
					}

				}

				log("links.length: " + links.length);

				links.push(colObjects[i].rdf);
			}

			log("links.length: " + links.length);

			log(rootNode.links.length);

			var schema = LinkedGov.getRDFSchema();

			if (!newRootNode) {

			} else {
				/*
				 * rootNode is a pointer object, so changes have been made to the
				 * schema already.
				 */
				schema.rootNodes.push(rootNode);
			}

			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema : JSON.stringify(schema)
			}, {}, {
				onDone : function() {
					self.onComplete();
				}
			});

		},

		onFail : function(message) {
			var self = this;
			alert("Date and time wizard failed.\n\n" + message);
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
			LinkedGov.showWizardProgress(false);
		},

		/*
		 * Returns the wizard to its original state
		 */
		onComplete : function() {
			var self = this;
			Refine.update({
				everythingChanged : true
			}, function() {
				LinkedGov.resetWizard(self.vars.elmts.dateTimeBody);
				LinkedGov.showWizardProgress(false);
			});

		}

};
