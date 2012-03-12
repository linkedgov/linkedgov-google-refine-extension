/*
 * dateTimeWizard
 * 
 * Lets the user select one or more columns that contain parts of, or a whole, 
 * date and time.
 * 
 * Once a column has been selected, there are six boxes representing the six 
 * date-time fragments that could be present: year, month, day, hour, minute, second - 
 * which the user can check to specify what parts of a date or time are contained in 
 * a column.
 * 
 * Depending on what combination is picked, further options are presented to the user, 
 * such as an input to describe a duration or a checkbox to specify that the month comes before 
 * the day in the way a date is formatted.
 * 
 * The "OWL Time" vocabulary is used for the singleton date-time fragments, otherwise a full 
 * date-time is typed as an xsd:dateTime and a full date-time that's been 
 * specified as a duration is described using a "Gregorian Interval" URI set from data.gov.uk.
 * 
 */
var LinkedGov_dateTimeWizard = {

		vars : {
			columns : [],
			colFragments : [],
			colObjects : [],
			elmts : {},
			resultColumn:"",
			vocabs : {
				time : {
					curie : "time",
					uri : "http://www.w3.org/2006/time#"
				},
				lg : {
					curie: "lg",
					uri : LG.vars.projectURI
				}
			},
			unexpectedValueRegex:'grel:if(isBlank(value),"date",if(type(value) == "date","date",if(isError(toDate(value).toString("HH:mm:ss")),"error","date")))'
		},

		/*
		 * Checks that columns have been selected, build and then store the RDF fragments.
		 */
		initialise : function(elmts) {

			var self = this;			

			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}

			self.vars.elmts = elmts;
			self.vars.columns = [];
			self.vars.colFragments = [];

			var error = false;

			if (elmts.dateTimeColumns.children("li").length > 0) {

				/*
				 * Remove any skipped columns or columns that have no date fragments
				 * specified.
				 * 
				 * Check for any options that may have been incorrectly specified that may 
				 * lead to problems later.
				 */
				self.vars.elmts.dateTimeColumns.children("li").each(function() {

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

					if($(this).children("span.unseparated").find('input.unseparated').attr('checked')){
						var unseparatedVal1 = $(this).children("span.unseparated").find('div.unseparated-input').find("select.duration1").val();
						var unseparatedVal2 = $(this).children("span.unseparated").find('div.unseparated-input').find("select.duration2").val();
						var unseparatedVal3 = $(this).children("span.unseparated").find('div.unseparated-input').find("select.duration3").val();

						if(unseparatedVal1 == unseparatedVal2 || unseparatedVal1 == unseparatedVal3 || unseparatedVal2 == unseparatedVal3) {
							error = true;
							self.onFail("The order of an unseparated date must contain unique values only.");
						} else if(unseparatedVal1 == "--" || unseparatedVal2 == "--" || unseparatedVal3 == "--"){
							error = true;
							self.onFail("You need to specify the order of the unseparated date.");						
						}
					}

				});

				if (!error) {

					/*
					 * Display the "working..." sign
					 */
					LG.showWizardProgress(true);

					/*
					 * Store the column names and their options
					 */
					self.vars.colObjects = self.buildColumnObjects();

					/*
					 * Begin a series of operations and finally save the RDF.
					 */
					self.checkForMultiColumnDateTimes(function() {
						self.checkCombinations(function() {
							
							/*
							 * We are able to test that the columns involved in the wizards operations have 
							 * resulted in being typed as a date or not.
							 */
							if(self.vars.expectedValue == "date" || self.vars.expectedValue == "time" || self.vars.expectedValue == "date-time"){
								// We populate the colObjects with the variables needed to perform these 
								// tests
								var colObjects = self.prepareColumnObjectsForValueTest();
								// Then initiate the test, passing the colObjects and the wizard's body
								LG.panels.wizardsPanel.checkForUnexpectedValues(colObjects, self.vars.elmts.dateTimeBody, function(){
									
									//log("Checking schema...");
									LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
										//log("About to save RDF...");
										self.saveRDF(rootNode, foundRootNode);
									});
								});
							}
							

						});
					});

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
		 *  
		 * E.g { name: col1, 
		 * 		 combi: "h-m-s", 
		 * 		 durationRDF:{...} 
		 *     },{ 
		 *     	 name:col2,
		 * 		 combi:"DD-MM-YYYY", 
		 * 		 dateTimeRDF:{...} 
		 *	   }
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

			var frags = [ 'Y', 'M', 'D', 'h', 'm', 's' ];

			var colObjects = [];

			/*
			 * Loop through the selected columns and store their fragments and
			 * options.
			 */
			for ( var i = 0; i < cols.length; i++) {

				var colObject = {};

				colObject.name = cols.eq(i).data('colName');

				/*
				 * Loop through the fragment checkboxes and build a combination 
				 * string for each column e.g. "Y-M-D".
				 */
				colObject.combi = "";
				var checkedInputs = cols.eq(i).children("span.dateFrags").children('input:checked');
				for ( var j = 0; j < checkedInputs.length; j++) {
					colObject.combi += checkedInputs.eq(j).val() + "-";
				}
				colObject.combi = colObject.combi.substring(0, colObject.combi.length - 1);

				/*
				 * Store the month before day value
				 */
				colObject.monthBeforeDay = cols.eq(i).children("span.mb4d").find('input.mb4d').attr('checked');

				/*
				 * Store the duration values
				 */
				if (cols.eq(i).children("span.duration").find('input.duration').attr('checked') && 
						cols.eq(i).children("span.duration").find('div.duration-input').find("input.duration-value").val().length > 0) {

					colObject.durationValue = cols.eq(i).children("span.duration")
					.find('div.duration-input')
					.find("input.duration-value")
					.val();

					colObject.durationUnit = cols.eq(i).children("span.duration")
					.find('div.duration-input')
					.find("select.duration")
					.val();

				}

				/*
				 * Store the 'unseparated date' information
				 */
				if (cols.eq(i).children("span.unseparated").find('input.unseparated').attr('checked')) {

					colObject.unseparated = true;

					colObject.unseparatedOrder = 
						cols.eq(i).children("span.unseparated").find('div.unseparated-input').find("select.duration1").val()+"-"+
						cols.eq(i).children("span.unseparated").find('div.unseparated-input').find("select.duration2").val()+"-"+
						cols.eq(i).children("span.unseparated").find('div.unseparated-input').find("select.duration3").val();

				}			

				/*
				 * Store the particular year value
				 */
				if (colObject.combi.indexOf("Y") < 0
						&& cols.eq(i).children("span.year").find('input.year').val().length > 0) {
					colObject.year = cols.eq(i).children("span.year").find('input.year').val();
				}
				/*
				 * Store the particular day value
				 */
				if (colObject.combi.indexOf("D") < 0
						&& cols.eq(i).children("span.day").find('input.day').val().length > 0) {
					colObject.day = cols.eq(i).children("span.day").find('input.day').val();
				}

				colObjects.push(colObject);

			} // end for

			return colObjects;

		},

		/*
		 * checkForMultiColumnDateTimes
		 * 
		 * This checks whether a date=time is spread across multiple columns, in 
		 * which case a new column is created containing the joined date-time and 
		 * then typed as a date within Refine.
		 */
		checkForMultiColumnDateTimes : function(callback) {

			var self = this;
			var colObjects = self.vars.colObjects;

			/*
			 * Check for the 3 simplest combinations that have every fragment in a
			 * different column:
			 * 
			 * Y-M-D, h-m-s, and Y-M-D-h-m-s
			 */
			if (colObjects.length == 3) {

				/*
				 * A 3-column date-time.
				 * 
				 * Check for a simple day, month, year combination, taking into account 
				 * that the column objects could be in any order in the array. E.g.
				 * 0[M], 1[Y], 2[D].
				 * 
				 * To see if all the fragments are present we use an array containing the 
				 * fragments we want.
				 */
				if (colObjects[0].combi == "Y" || colObjects[0].combi == "M" || colObjects[0].combi == "D") {
					var fragCount = 0;
					var frags = [ 'D', 'M', 'Y' ];
					var colArray = [];
					/*
					 * Loop through the column objects, checking each combination
					 */
					for ( var i = 0; i < colObjects.length; i++) {
						/*
						 * If there's a match, store the name of the column in an array
						 * which gets passed to the 'create new column' function and increment 
						 * the array index for the fragment array that's being checked against.
						 */
						if (colObjects[i].combi == frags[fragCount]) {
							colArray.push(colObjects[i].name);
							var monthBeforeDay = colObjects[i].monthBeforeDay;
							fragCount++;
							i--;
							/*
							 * If we have iterated through all of the fragments to be 
							 * checked against, that means all the fragments we want are 
							 * present and we can proceed to create a new column containing 
							 * the date-time.
							 */
							if (fragCount == frags.length) {
								// We have a year, month and day
								log("We have year, month and day across three columns.");
								
								/*
								 * Merge the multiple columns into one and create an
								 * object for it in the colObjects array.
								 */
								self.createSingleColumnDate(colArray, "Y-M-D", monthBeforeDay, callback);

							}
						}
					}
				} else {
					/*
					 * Another 3-column date-time.
					 * 
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
							i--;
							if (fragCount == frags.length) {
								// We have hours, minutes and seconds
								log("We have hours, minutes and seconds across three columns");
								/*
								 * Create a new column with the combined date
								 * fragments, then type it as a date within Refine.
								 */
								self.createSingleColumnDate(colArray, "h-m-s", false, callback);
							}
						}
					}
				}
			} else if (colObjects.length == 2) {

				/*
				 * Check for a date-time across 2 columns.
				 * 
				 * If we have Y-M-D selected, check if we have h-m or h-m-s selected
				 */
				for ( var a = 0; a < colObjects.length; a++) {
					if (colObjects[a].combi == "Y-M-D" && (colObjects[(a == 0 ? 1 : 0)].combi == "h-m" || colObjects[(a == 0 ? 1 : 0)].combi == "h-m-s")) {

						var monthBeforeDay = colObjects[a].monthBeforeDay;
						/*
						 * If Y-M-D specified, store the column name
						 */
						var colArray = [ colObjects[a].name ];
						/*
						 * Loop through the columns to see if the other column
						 * is the other half of the date-time.
						 */
						for ( var i = 0; i < colObjects.length; i++) {

							if (colObjects[i].combi == "h-m") {
								colArray.push(colObjects[i].name);
								log("We have a year, month, day, hours and minutes spread across two columns");
								self.createSingleColumnDate(colArray, "Y-M-D-h-m", monthBeforeDay, callback);
							} else if (colObjects[i].combi == "h-m-s") {
								colArray.push(colObjects[i].name);
								log("We have a year, month, day, hours, minutes and seconds spread across two columns");
								self.createSingleColumnDate(colArray, "Y-M-D-h-m-s", monthBeforeDay, callback);
							}

						}
					} else {
						callback();
					}
				}

			} else if (colObjects.length == 6) {

				/*
				 * Check for a six-column date-time
				 */
				var fragCount = 0;
				var frags = [ 'D', 'M', 'Y', 'h', 'm', 's' ];
				var colArray = [];
				for ( var i = 0; i < colObjects.length; i++) {
					if (colObjects[i].combi == frags[fragCount]) {
						colArray.push(colObjects[i].name);
						var monthBeforeDay = colObjects[i].monthBeforeDay;
						fragCount++;
						i--;
						if (fragCount == frags.length) {
							// We have years, months, days, hours, minutes and
							// seconds
							log("We have a year, month, day, hours, minutes and seconds spread across six columns");
							
							self.createSingleColumnDate(colArray, "Y-M-D-h-m-s", monthBeforeDay, callback);
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
		 * new column in Refine and type it as a proper date.
		 * 
		 * We then remove any of the columns used in creating the new column from
		 * the column object array, and insert the new column (and it's options)
		 * into the column object array.
		 */
		createSingleColumnDate : function(cols, combination, monthBeforeDay, callback) {

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
			 * Remove the trailing part of the expression (+"-"+)
			 */
			expr = expr.substring(0, expr.length - 5);
			newName = newName.substring(0, newName.length - 1);


			/*
			 * Remove the column objects used to create the new combined
			 * column object.
			 */
			for ( var i = 0; i < self.vars.colObjects.length; i++) {
				for ( var j = 0; j < cols.length; j++) {
					if (self.vars.colObjects[i].name == cols[j]) {
						self.vars.colObjects.splice(i, 1);
						i--;
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

						self.vars.resultColumn = newName;
						/*
						 * Create the column object for the new column
						 */
						self.vars.colObjects.push({
							name : newName,
							combi : combination,
							monthBeforeDay : monthBeforeDay
						});

						for(var i=0;i<cols.length;i++){
							LG.ops.removeColumn(cols[i]);
							if(i == cols.length-1){
								Refine.update({modelsChanged:true},function(){
									if(callback){
										callback();
									}
								});
							}
						}

					}
				});
			} catch (e) {
				log(e);
				alert("A column already exists with the name "
						+ newName
						+ ", \"(LG)\" has been appended to the column name for now.");
				Refine.postCoreProcess("add-column", {
					baseColumnName : cols[0],
					expression : expr,
					newColumnName : newName + " (LG)",
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
							name : newName + " (LG)",
							combi : combination,
							monthBeforeDay : monthBeforeDay
						});

						if(callback){
							callback();
						}
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

			/*
			 * If a full date-time was not found across multiple columns, loop through the
			 * column objects and check their invidual fragment combinations as well as their 
			 * date options.
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				if(colObjects[i].combi.length > 0) {
					/*
					 * Any date/time that includes a year, day and month can be typed
					 * within Refine as a date.
					 */
					switch (colObjects[i].combi) {

					case "Y-M-D":
						// Format and type as an XSD date
						self.vars.expectedValue = "date";
						self.formatDateInRefine(colObjects[i]);
						colObjects[i].rdf = self.makeXSDDateTimeFragment(colObjects[i]);
						break;
					case "Y-M-D-h":
						// Format and create gregorian data.gov.uk URI
						self.vars.expectedValue = "date";
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}
						break;
					case "Y-M-D-h-m":
						// Format and create gregorian data.gov.uk URI
						self.vars.expectedValue = "date";
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}					
						break;
					case "Y-M-D-h-m-s":
						// Format and create gregorian data.gov.uk URI
						self.vars.expectedValue = "date";
						self.formatDateInRefine(colObjects[i]);
						if(typeof colObjects[i].durationValue != 'undefined') {
							colObjects[i].rdf = self.makeXSDDateTimeIntervalURIFragment(colObjects[i]);
						} else {
							colObjects[i].rdf = self.makeXSDDateTimeInstantURIFragment(colObjects[i]);
						}					
						break;
					default:
						/*
						 * All other combinations have generic RDF produced using the Time vocabulary. 
						 * Depending on whether the column has been specified as containing a duration -  
						 * a time:Interval or time:Instant is created.
						 */
						if(colObjects[i].combi == "h-m-s"){
							self.vars.expectedValue = "time";
						} else {
							self.vars.expectedValue = "fragment";
						}

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

					/*
					 * Place callback inside the loop to prevent it being called too early.
					 */
					if (i == colObjects.length - 1) {
						self.vars.resultColumn = colObjects[i].name;
						if(callback){
							callback();
						}
					}

				} else {
					alert("Sorry, the date combination you specified for the column: \""+colObjects[i].name+"\" cannot be processed.");
				}

			} 

		},

		/*
		 * formatDateInRefine
		 * 
		 * Posts a silent text-transform process call (i.e. without a noticeable UI
		 * update) that formats a column to contain dates.
		 */
		formatDateInRefine : function(colObject) {

			//log("formatDateInRefine");

			var self = this;

			if(colObject.unseparated){

				var dateOrder = colObject.unseparatedOrder.split("-");

				if(dateOrder.length != 3) {
					self.onFail("Unseparated date values not selected properly.");
				} else {

					for(var i=0;i<dateOrder.length;i++){
						if(dateOrder[i] == "year"){
							dateOrder[i] = "value[0,4]";
						} else if(dateOrder[i] == "month"){
							dateOrder[i] = "value[4,6]";
						} else if(dateOrder[i] == "day"){
							dateOrder[i] = "value[6,8]";
						}
					}

					LG.silentProcessCall({
						type : "POST",
						url : "/command/" + "core" + "/" + "text-transform",
						data : {
							columnName : colObject.name,
							expression : 'if(value.length()==8,toDate('+dateOrder[0]+'+"-"+'+dateOrder[1]+'+"-"+'+dateOrder[2]+'),value)',
							onError : 'keep-original',
							repeat : false,
							repeatCount : ""
						},
						success : function() {
							self.vars.resultColumn = colObject.name;
							Refine.update({cellsChanged : true});
						},
						error : function() {
							self.onFail("A problem was encountered when performing a text transform on the column: \""+ colObject.name + "\".");
						}
					});			
				}

			} else {
				/*
				 * The GREL function toDate() takes a boolean for the 'month before day'
				 * value, which changes the order of the month-day in the date.
				 */
				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "text-transform",
					data : {
						columnName : colObject.name,
						expression : 'toDate(value,' + (colObject.monthBeforeDay) + ')',
						onError : 'keep-original',
						repeat : false,
						repeatCount : ""
					},
					success : function() {
						self.vars.resultColumn = colObject.name;
						Refine.update({cellsChanged : true});
					},
					error : function() {
						self.onFail("A problem was encountered when performing a text transform on the column: \""+ colObject.name + "\".");
					}
				});
			}

		},

		/*
		 * makeInstantFragment
		 * 
		 * Creates a time:Instant object (a blank node) for the row in the schema.
		 * 
		 * Creates and attaches the individual Instant fragments to the blank node by 
		 * looping through a column's combination parts.
		 * 
		 * E.g. for a column of times, "14:30:00", needs to be broken in to singletons, 
		 * allowing us to say that this instant is at 14 hours, 30 minutes and 00 seconds.
		 */
		makeInstantFragment:function(colObject){

			var self = this;

			var colName = colObject.name;
			var combi = colObject.combi;
			var camelColName = LG.camelize(colName);

			/*
			 * Create the time:Instant object - using the column name 
			 * as the row-property.
			 */
			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-blank",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[{
							"uri":self.vars.vocabs.time.uri+"Instant",
							"curie":self.vars.vocabs.time.curie+":Instant"
						}],
						"links":[]
					}
			};

			var combiArray = combi.split("-");

			for(var i=0; i<combiArray.length; i++){

				var fragName = "";

				/*
				 * Depending on the combination part, we state the part's proper name to 
				 * be used when describing it's property/value in RDF using the Time 
				 * vocabulary.
				 */
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

				/*
				 * This tells us what value to expect when we perform our 
				 * unexpected values test.
				 */
				self.vars.expectedValue = fragName;


				/*
				 * Create the Instant fragment and attach it to the Instant
				 * blank node.
				 * 
				 * Depending on the combiArray index, split the value of the date-time
				 * using a separator character and select the part of it that corresponds 
				 * to the index value we're iterating throught the combiArray with.
				 * 
				 * TODO: Cannot assume the separator character is always ":".
				 */
				o.target.links.push({
					"uri":"http://www.w3.org/2006/time#"+fragName,
					"curie":"time:"+fragName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value.split(/[^0-9]+/)["+i+"]",
						"valueType":"http://www.w3.org/2001/XMLSchema#int",
						"columnName":colName,
						"isRowNumberCell":false
					}
				});
			}

			return o;
		},


		/*
		 * Similar to the makeInstantFragment - the only differences being the type of the 
		 * blank node is now an Interval and not an Instant - and the part name's are plurals 
		 * of the date-time fragment.
		 */
		makeIntervalFragment:function(colObject){

			var self = this;

			var colName = colObject.name;
			var combi = colObject.combi;
			var camelColName = LG.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-blank",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[{
							"uri":self.vars.vocabs.time.uri+"Interval",
							"curie":self.vars.vocabs.time.curie+":Interval"
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
						"expression":"value.split(/[^0-9]+/)["+i+"]",
						"valueType":"http://www.w3.org/2001/XMLSchema#int",
						"columnName":colName,
						"isRowNumberCell":false
					}
				});
			}

			return o;
		},

		/*
		 * makeXSDDateFragment
		 * 
		 * Creates RDF for a short-hand date.
		 * 
		 * A full-date time that's not a duration and that is not formatted properly 
		 * for some reason.
		 * 
		 * TODO: Not sure how this would ever happen - surely a full date-time would be 
		 * properly formatted/typed as a date before this stage.
		 * 
		 * We use the column name as the row property and type the value as 
		 * an xsd:date.
		 */
		makeXSDDateFragment:function(colObject){

			var self = this;

			//log("makeXSDDateFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LG.camelize(colName);

			/*
			 * To make sure we have the date format needed to type it as 
			 * an xsd:date - we convert the value to a date in Refine first.
			 * Once a date object in Refine, we can use a string formatter to 
			 * ask for a particular format for the date.
			 */
			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"if(type(value)==\"date\",value.toDate("+mb4d+").toString(\"yyyy-MM-dd\"),escape(value,'xml'))",
						"valueType":"http://www.w3.org/2001/XMLSchema#date",
						"columnName":colName,
						"isRowNumberCell":false
					}
			};

			return o;
		},


		/*
		 * makeXSDDateTimeFragment
		 * 
		 * Similar to makeXSDDateFragment - but typed as a more useful 
		 * xsd:dateTime and formatting for a timestamp included in the expression.
		 */
		makeXSDDateTimeFragment:function(colObject){

			var self = this;

			//log("makeXSDDateTimeFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LG.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"if(type(value)==\"date\",value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")+\"T\"+value.toDate("+mb4d+").toString(\"HH:mm:ss\"),escape(value,'xml'))",
						"valueType":"http://www.w3.org/2001/XMLSchema#dateTime",
						"columnName":colName,
						"isRowNumberCell":false
					}
			};

			return o;

		},


		/*
		 * makeXSDDateTimeInstantURIFragment
		 * 
		 * Creates RDF for a full date-time instant - using data.gov.uk's URI set.
		 * 
		 * The date format we want is achieved similar to the makeXSDDateFragment and 
		 * makeXSDDateTimeFragment. That's then joined onto the gregorian instant URI.
		 */
		makeXSDDateTimeInstantURIFragment:function(colObject){

			var self = this;

			//log("makeXSDDateTimeInstantURIFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LG.camelize(colName);

			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"if(type(value)==\"date\",\"http://reference.data.gov.uk/doc/gregorian-instant/\"+value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")+\"T\"+value.toDate("+mb4d+").toString(\"HH:mm:ss\"),escape(value,'xml'))",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[],
						"links":[]
					}
			};

			return o;

		},

		/*
		 * makeXSDDateTimeIntervalURIFragment
		 * 
		 * Similar to makeXSDDateTimeInstantURIFragment, but appends a duration code 
		 * to the end of the URI - which has also changed to "gregorian-interval" instead of 
		 * "gregorian-instant".
		 */
		makeXSDDateTimeIntervalURIFragment:function(colObject){

			var self = this;

			//log("makeXSDDateTimeIntervalURIFragment");

			var colName = colObject.name;
			var mb4d = colObject.monthBeforeDay;
			var camelColName = LG.camelize(colName);	
			var unit = colObject.durationUnit;
			var value = colObject.durationValue;

			/*
			 * Create the RDF object and the first part of the date-time's URI.
			 */
			var o = {
					"uri":self.vars.vocabs.lg.uri+camelColName,
					"curie":self.vars.vocabs.lg.curie+":"+camelColName,
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"if(type(value)==\"date\",\"http://reference.data.gov.uk/doc/gregorian-interval/\"+value.toDate("+mb4d+").toString(\"yyyy-MM-dd\")+\"T\"+value.toDate("+mb4d+").toString(\"HH:mm:ss\"),escape(value,'xml'))",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[],
						"links":[]
					}
			};

			/*
			 * Depending on the duration type, create a string that 
			 * describes that duration according to the ISO standard and 
			 * data.gov.uk's URI set.
			 * 
			 * http://en.wikipedia.org/wiki/ISO_8601#Durations
			 * 
			 * TODO: Should use Y,M,D for the unit values in the
			 * select dropdown in the wizard and remove seconds.
			 * 
			 * TODO: What if the duration is 1 hour, 30 minutes.
			 */
			var durationCode = "";
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
			/*
			 * Append the code to the expression for RDF object.
			 */
			o.target.expression = o.target.expression + durationCode;

			return o;

		},

		/*
		 * saveRDF
		 * 
		 */
		saveRDF : function(rootNode, newRootNode) {

			//log("saveRDF");

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

				links.push(colObjects[i].rdf);
			}

			/*
			 * Check to see if the RDF needs to be added to the schema.
			 */
			var schema = LG.rdfOps.getRDFSchema();
			if (!newRootNode) {
				log("RootNode has been updated...");
			} else {
				log("Adding first rootNode...");
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

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {
			var self = this;
			alert("Date and time wizard failed.\n\n" + message);
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.dateTimeBody);
			LG.showWizardProgress(false);
		},

		/*
		 * onComplete
		 * 
		 * - Performs a default update
		 * - Returns the wizard to its original state
		 * - Checks for unexpected values
		 */
		onComplete : function() {
			var self = this;

			Refine.update({
				everythingChanged : true
			}, function() {
				// Reset the wizard
				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.dateTimeBody);
				// Present an Undo button
				LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.dateTimeBody);
				// Hide the "wizard in progress" message
				LG.showWizardProgress(false);
			});

		},

		/*
		 * prepareColumnObjectsForValueTest
		 * 
		 * Stores the variables needed to run the 'unexpected values' test on the columns
		 * inside each of the column objects.
		 * 
		 * Variables:
		 * 
		 * - the expression (an expression needed to produce the values to check for - e.g. 
		 * "date" and "error" for dates, or "postcode" and "address" for postcodes).
		 * - expectedType (the expected type of value - e.g. "date" for dates and "postcode" for 
		 * postcodes).
		 * - exampleValue (to provide as a hint to the user while they are correcting the values - 
		 * e.g. "2012-03-15" for dates or "NW31PL" for postcodes.
		 * - the column name 
		 * 
		 * These are stored inside the colObject.unexpectedValueParams object.
		 */
		prepareColumnObjectsForValueTest:function(){

			var self = this;

			var colObjects = self.vars.colObjects;

			// Loop through the colObjects and populate their variables accordingly
			for(var i=0;i<colObjects.length;i++){

				colObjects[i].unexpectedValueParams = {
						expression:self.vars.unexpectedValueRegex,
						expectedValue:self.vars.expectedValue,
						exampleValue:(self.vars.expectedValue == "date" ? "29/04/2009" : "13:30:00"),
						colName:colObjects[i].name
				};

				if(self.vars.expectedValue == "date-time"){
					colObjects[i].unexpectedValueParams.exampleValue = "29/04/2009-13:30:00";
				}
			}

			return colObjects;

		},

		/*
		 * rerunWizard
		 * 
		 * Called in the unexpected values panel - runs the wizard from the point 
		 * of which it's already set-up and built it's column objects (i.e. 
		 * misses out a few initial function calls).
		 */
		rerunWizard: function(){

			var self = this;
			
			self.checkForMultiColumnDateTimes(function() {
				self.checkCombinations();
			});
			
		}
};
