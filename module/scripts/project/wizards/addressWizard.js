/*
 * addressWizard
 * 
 * The address wizard helps to clean up addresses, with the postcode being the
 * highest priority.
 * 
 * A user is able to select one column containing a full address, in which case,
 * a regular expression is used to separate the different parts of the address
 * into separate columns, so types can be applied to those columns.
 * 
 * The user is also able to select multiple columns that contain fragments of an
 * address, in which case the relevant address fragment RDF is produced for the columns.
 * 
 * Postcode regex obtained from Wikipedia:
 * http://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Validation
 * 
 */
var LinkedGov_addressWizard = {

		/*
		 * Regex has been modified to account for a space in the middle of postcodes: 
		 * "Z]?{0" 
		 * to
		 * "Z]? {0".
		 */
		vars : {
			elmts : {},
			postCodeRegex : '/(([gG][iI][rR] {0,}0[aA]{2})|((([a-pr-uwyzA-PR-UWYZ][a-hk-yA-HK-Y]?[0-9][0-9]?)|(([a-pr-uwyzA-PR-UWYZ][0-9][a-hjkstuwA-HJKSTUW])|([a-pr-uwyzA-PR-UWYZ][a-hk-yA-HK-Y][0-9][abehmnprv-yABEHMNPRV-Y]))) {0,}[0-9][abd-hjlnp-uw-zABD-HJLNP-UW-Z]{2}))/',
			colObjects : [],
			vocabs : {
				rdfs : {
					curie : "rdfs",
					uri : "http://www.w3.org/2000/01/rdf-schema#"
				},
				vcard : {
					curie : "vcard",
					uri : "http://www.w3.org/2006/vcard/ns#"
				},
				ospc : {
					curie : "ospc",
					uri : "http://data.ordnancesurvey.co.uk/ontology/postcode/",
					resourceURI : "http://data.ordnancesurvey.co.uk/id/postcodeunit/"
				},
				lg : {
					curie: "lg",
					uri: LG.vars.projectURI
				}
			},
			hiddenColumns : [],
			postcodePresent: false,
			unexpectedValueRegex:''
		},

		/*
		 * initialise
		 * 
		 * Build the column objects and commence a chain of validation and RDF saving 
		 * operations.
		 */
		initialise : function(elmts) {

			var self = this;

			self.vars.elmts = elmts;

			// We store the current Undo/Redo history ID in order to 
			// rollback one step when the user presses "Undo" at the end of the wizard
			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}			

			self.vars.hiddenColumns = [];
			self.vars.addressName = "";
			self.vars.postcodePresent = false;
			// Construct a GREL expression to be used in the unexpected values panel for validating
			// a postcode. Tests to see if the value is blank or if it's a valid postcode. If it's valid
			// or blank, it returns the value "postcode", otherwise "error".
			self.vars.unexpectedValueRegex = 'grel:if(isBlank(value),"postcode",if(isError(if(partition(value,'+self.vars.postCodeRegex+')[1].length() > 0,"postcode","error")),"error",if(partition(value,'+self.vars.postCodeRegex+')[1].length() > 0,"postcode",if(isBlank(cells["postcode"].value),"error","postcode"))))';

			/*
			 * Build an array of column objects with their options
			 * 
			 * {name - column name part - the specified address part
			 * containsPostcode - boolean is user has specified the column contains
			 * a post code.}
			 */
			self.vars.colObjects = self.buildColumnObjects();

			if (self.vars.colObjects.length > 0) {

				/*
				 * Ask the user to enter a name for the location (as a form 
				 * of identification if there is more than one location per row).
				 */
				while(self.vars.addressName.length < 3){
					self.vars.addressName = window.prompt("Enter a name for this location, e.g. \"Home address\" :","");
					if(self.vars.addressName.length < 3){
						alert("The name must be 3 letters or longer, try again...");
					}
				}

				LG.showWizardProgress(true);

				/*
				 * A marker for recursing through the columns.
				 */
				var index = 0;

				/*
				 * Perform the postcode regex match on any columns that contain postcodes
				 */
				self.validatePostCodeColumns(index, function() {

					/*
					 * We can check that a column contains postcodes if the user 
					 * has specified it does
					 */
					if(self.vars.postcodePresent){

						// If one of the columns contains a postcode, 
						// we can run an "unexpected values" test on it.
						var colObjects = self.prepareColumnObjectsForValueTest();
						LG.panels.wizardsPanel.checkForUnexpectedValues(colObjects, self.vars.elmts.addressBody, function(){

							/*
							 * Build the address fragments RDF
							 */
							self.makeAddressFragments(function(){
								/*
								 * Create a new column containing the parts of the address
								 * the user specified and collapse the other columns.
								 */
								self.createAddressColumn(function(){
									/*
									 * Save the RDF
									 */
									LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
										self.saveRDF(rootNode, foundRootNode);
									});

								})
							});
						});
					} else {

						// If there are no postcodes present then there isn't 
						// really any validation tests when can run
						/*
						 * Build the address fragments RDF
						 */
						self.makeAddressFragments(function(){
							/*
							 * Create a new column containing the parts of the address
							 * the user specified and collapse the other columns.
							 */
							self.createAddressColumn(function(){
								/*
								 * Save the RDF
								 */
								LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
									self.saveRDF(rootNode, foundRootNode);
								});

							})
						});
					}
				});

			} else {
				alert("You need to specify one or more columns as having a part of an address in.")
			}
		},

		/*
		 * buildColumnObjects
		 * 
		 * Creates an array of fragment/column name objects.
		 */
		buildColumnObjects : function() {

			//log("buildColumnObjects");

			var self = this;
			var array = [];

			/*
			 * If there are columns that have been selected, loop through them and 
			 * store their names and options in an array so we can 
			 */
			if ($(self.vars.elmts.addressColumns).children("li").length > 0) {
				$(self.vars.elmts.addressColumns).children("li").each(function() {

					var el = $(this);
					/*
					 * Skip any columns that have been removed
					 */
					if (!$(this).hasClass("skip")) {

						/*
						 * Each column object contains the column name, the type of address fragment it contains, and
						 * a boolean for whether it contains a postcode.
						 */
						array.push({
							name : el.data("colName"),
							part : el.find("select").val(),
							containsPostcode : el.find("input.postcode[type='checkbox']").attr("checked")
						});

					}
				});

				return array;
			} else {
				return array;
			}
		},

		/*
		 * validatePostCodeColumns
		 * 
		 * Checks for any columns that have been specified as containing postcodes.
		 * 
		 * It then runs a regex match on the postcode values, which if they pass, become 
		 * uppercased and have any spaces removed. The values that fail the postcode 
		 * regex are left as they are.
		 * 
		 */
		validatePostCodeColumns : function(index, callback) {

			var self = this;
			var colObjects = self.vars.colObjects;
			var i = index;

			/*
			 * Check to see if we have gone through every column, if we haven't, 
			 * check to see if the column has been specified to contain postcodes
			 */
			if (i >= colObjects.length) {
				callback();
			} else if (colObjects[i].containsPostcode || colObjects[i].part == "postcode") {

				self.vars.postcodePresent = true;

				/*
				 * In case of a postcode appearing in a mixed address value (i.e. with many parts),
				 * we need to extract and create a new column for the postcode, while at the same time, 
				 * performing validation on the values using the eexpression
				 *
				 * partition() is the GREL function used to perform the regex match. It returns 
				 * an array of 3 elements - the middle element being the regex match.
				 * 
				 * The expression ends with "[1]" so we grab the middle element (the
				 * postcode value) of the returned 3-part regex result.
				 * 
				 * baseColumnName: the column containing postcodes
				 * expression: an expression that validates and extracts a postcode from a string
				 * newColumnName: a name for the new column containg postcodes (trying to avoid a clash so using (LG))
				 * columnInsertIndex: the position to insert the new column (just after the postcode column in our case)
				 * onError: if there's an error, we want to keep the original value
				 */
				Refine.postCoreProcess(
						"add-column",
						{
							baseColumnName : colObjects[i].name,
							expression : "if(partition(value,"+self.vars.postCodeRegex+")[1].length() > 0,toUppercase(partition(value,"+self.vars.postCodeRegex+")[1].replace(' ','')),trim(value))",
							newColumnName : colObjects[i].name + " Postcode (LinkedGov)",
							columnInsertIndex : Refine.columnNameToColumnIndex(colObjects[i].name) + 1,
							onError : "keep-original"
						},
						null,
						{
							modelsChanged : true
						},
						{
							onDone : function() {

								/*
								 * If the column selected had other address
								 * parts in it, then we don't want to remove
								 * it.
								 */
								if (colObjects[i].part == "mixed") {

									//log("We have a mixed address");

									/*
									 * We need to add a new column object to the array for the new postcode 
									 * column that has just been created.
									 */
									colObjects.splice(colObjects.length, 0, {
										name : colObjects[i].name + " Postcode (LinkedGov)",
										part : "postcode",
										containsPostcode : true
									});

									i++;

									// After adding the new postcode column to the colObjects array, 
									// we can check to see if we started with one column, then after adding this 
									// column means we have 2 columns - meaning we can perform a callback without 
									// recursing any further.
									if (colObjects.length == 2) {
										callback();
									} else {
										self.validatePostCodeColumns(i, callback);
									}

								} else {

									//log("Removing postcode column");

									// Remove the old postcode column
									LG.silentProcessCall({
										type : "POST",
										url : "/command/" + "core" + "/" + "remove-column",
										data : {
											columnName : colObjects[i].name
										},
										success : function() {

											/*
											 * After removing the old postcode column, we want to give the new column
											 * the same name as the old column.
											 */
											LG.silentProcessCall({
												type : "POST",
												url : "/command/" + "core" + "/" + "rename-column",
												data : {
													oldColumnName : colObjects[i].name + " Postcode (LinkedGov)",
													newColumnName : colObjects[i].name
												},
												success : function() {

													/*
													 * Locate the old postcode column in the column object array and 
													 * update it's name and options to the new postcode column.
													 */
													for ( var j = 0; j < colObjects.length; j++) {
														if (colObjects[j].name == colObjects[i].name) {
															colObjects[j] = {
																	name : colObjects[i].name,
																	part : "postcode",
																	containsPostcode : true
															};
														}
													}

													i++;
													self.validatePostCodeColumns(i, callback);
												},
												error : function() {
													self.onFail("A problem was encountered when renaming the column: \""
															+ colObjects[i].name
															+ " Postcode (LinkedGov)\".");
												}
											});
										},
										error : function() {
											self.onFail("A problem was encountered when removing the column: \""
													+ colObjects[i].name
													+ "\".");
										}
									});

								}

							}
						});

			} else {
				i++;
				self.validatePostCodeColumns(i, callback);
			}

		},

		/*
		 * makeAddressFragments
		 * 
		 * Loops through the column objects and constructs the URIs & CURIEs for 
		 * the different address fragments before storing each columns RDF in their 
		 * relevant column object.
		 */
		makeAddressFragments : function(callback) {

			//log("makeAddressFragments");

			var self = this;
			var colObjects = self.vars.colObjects;
			var vocabs = self.vars.vocabs;
			var uri, curie = "";

			/*
			 * Loop through the colObject parts, which can be:
			 *  - postcode (make an OSPC RDF fragment) 
			 *  - street-address 
			 *  - extended-address 
			 *  - postal-code 
			 *  - locality 
			 *  - country-name
			 *  - mixed
			 */
			for (var i=0; i<colObjects.length; i++) {

				/*
				 * The only special cases for the address fragment RDF
				 * are the "postcode" fragment and a "mixed" address. The others
				 * all share similar RDF.
				 * 
				 */
				switch (colObjects[i].part) {

				case "mixed":

					/*
					 * Mixed addresses (i.e. a multi-part address as a single string) are 
					 * stored using the vCard:Label property.
					 */
					uri = vocabs.vcard.uri + "Label";
					curie = vocabs.vcard.curie + ":" + "Label";
					colObjects[i].rdf = self.makeVCardFragment(colObjects[i].name, uri, curie);
					break;

				case "postcode":

					/*
					 * Create the vCard postcode RDF
					 */
					uri = vocabs.vcard.uri + colObjects[i].part;
					curie = vocabs.vcard.curie + ":" + colObjects[i].part;
					colObjects[i].rdf = self.makeVCardFragment(colObjects[i].name, uri, curie);
					/*
					 * Create the OSPC postcode RDF
					 */
					uri = vocabs.ospc.uri + colObjects[i].part;
					curie = vocabs.ospc.curie + ":" + colObjects[i].part;
					colObjects[i].ospcRdf = self.makeOSPCFragment(colObjects[i].name, uri, curie, vocabs.ospc.resourceURI);
					break;

				default:

					/*
					 * Create the other vCard address fragments
					 */
					uri = vocabs.vcard.uri + colObjects[i].part;
				curie = vocabs.vcard.curie + ":" + colObjects[i].part;
				colObjects[i].rdf = self.makeVCardFragment(colObjects[i].name, uri, curie);
				break;

				}

			}

			/*
			 * Call the callback function here instead of after the for loop as it sometimes 
			 * gets called before it's finished iterating.
			 */
			callback();


		},

		/*
		 * createAddressColumn
		 * 
		 * Create a new column for the address parts the user specified, with each 
		 * part separated by a comma.
		 * 
		 * Finally, collapse the address-part columns used to create the new column.
		 */
		createAddressColumn:function(callback){

			//log("createAddressColumn");

			var self = this;
			var colObjects = self.vars.colObjects;

			log(colObjects[0].part);
			
			if(colObjects.length == 1 && colObjects[0].part == "mixed"){
				// A new column doesn't need to be created if only a mixed 
				// address column is specified.
				callback();
			} else if(colObjects.length == 2 && colObjects[0].part == "mixed" && colObjects[1].part == "postcode") {
				// A new column doesn't need to be created if only a mixed 
				// address column is specified.
				LG.ops.hideColumnCompletely(colObjects[1].name);
				self.vars.hiddenColumns.push(colObjects[1].name);
				callback();				
			} else if(colObjects.length == 2 && colObjects[0].part == "postcode" && colObjects[1].part == "mixed"){
				// A new column doesn't need to be created if only a mixed 
				// address column is specified.
				LG.ops.hideColumnCompletely(colObjects[0].name);
				self.vars.hiddenColumns.push(colObjects[0].name);
				callback();
			} else {
				/*
				 * Build the expression used to join the various 
				 * address parts together as a string.
				 */
				var expression = "";
				var addressParts = ["street-address","extended-address","locality","region","country-name","postcode"];
				var lastCol = "";

				// Build an expression that concatenates the columns in question in the order described 
				// by the addressParts array above.
				for(var h=0; h<addressParts.length;h++){
					for(var i=0; i<colObjects.length; i++){
						if(colObjects[i].part == addressParts[h]){
							expression += 'if(isError(cells["' + colObjects[i].name + '"].value),"",if(isBlank(cells["' + colObjects[i].name + '"].value),"",cells["' + colObjects[i].name + '"].value+", "))+';
							lastCol = colObjects[i].name;
						}
					}
				}

				// Remove the ", " from the end of our expression using chomp()
				expression = 'chomp('+expression.substring(0,expression.length-1)+',", ")';

				//log(expression);


				// Adds a new column containing a concatenation of the values specified 
				// in each of the columns specified by the user for the wizard.
				Refine.postCoreProcess(
						"add-column",
						{
							baseColumnName : colObjects[0].name,
							expression : expression,
							newColumnName : self.vars.addressName,
							columnInsertIndex : Refine.columnNameToColumnIndex(lastCol) + 1,
							onError : "keep-original"
						},
						null,
						{
							modelsChanged : true
						},
						{
							onDone : function() {

								for(var i=0; i<colObjects.length; i++){
									LG.ops.hideColumnCompletely(colObjects[i].name);
									self.vars.hiddenColumns.push(colObjects[i].name);
								}

								self.vars.colObjects.push({
									name:self.vars.addressName
								});

								callback();

							}
						}
				);
			}

		},

		/*
		 * saveRDF
		 * 
		 * Builds the vCard:Address node and adds the 
		 * various address fragments to it before adding it to the RDF schema.
		 */
		saveRDF : function(rootNode, newRootNode) {

			//log("saveRDF");

			var self = this;
			var elmts = this.vars.elmts;
			var colObjects = self.vars.colObjects;

			/*
			 * Any address data will always be the child of a vCard:Address node, 
			 * which are identified using the hash ID "#columnName".
			 */
			var addressName = LG.urlifyColumnName(self.vars.addressName);

			/*
			 * The vcard Address template:
			 * 
			 * "uri" : http://data.linkedgov.org/dataset/1398564336982/0#+homeAddress,
			 *		"curie" : lg+":"+homeAddress,
			 *		"target" : {
			 *			"nodeType" : "cell-as-resource",
			 *			"expression" : "value+\"#"+homeAddress+"\"",
			 *			"isRowNumberCell" : true,
			 *			"rdfTypes" : [ {
			 *				"uri" : "http://www.w3.org/2006/vcard/ns#Address",
			 *				"curie" : "vcard:Address"
			 *			} ],
			 *			"links" : []
			 *		}
			 * 
			 * Output as TTL:
			 * 
			 * <http://data.linkedgov.org/dataset/1398564336982/2#popo> a vcard:Address ; 
			 * vcard:street-address "OLD QUEEN STREET" ; 
			 * vcard:locality "LONDON" ; 
			 * ospc:postcode <http://data.ordnancesurvey.co.uk/id/postcodeunit/SW1H9HP> ; 
			 * vcard:postcode "SW1H9HP" .
			 */
			var vcardObj = {
					"uri" : self.vars.vocabs.lg.uri+addressName,
					"curie" : self.vars.vocabs.lg.curie+":"+addressName,
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "value+\"#"+addressName+"\"",
						"isRowNumberCell" : true,
						"rdfTypes" : [ {
							"uri" : "http://www.w3.org/2006/vcard/ns#Address",
							"curie" : "vcard:Address"
						} ],
						"links" : []
					}
			};

			/*
			 * Loop through the column objects and add their RDF, making sure to add the RDF for the 
			 * postcode fragment which contains slightly different RDF data to the other fragments.
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				if (colObjects[i].containsPostcode && colObjects[i].part == "postcode") {
					vcardObj.target.links.push(colObjects[i].ospcRdf);
				}
				if (typeof colObjects[i].rdf != 'undefined') {
					vcardObj.target.links.push(colObjects[i].rdf);
				} else {
					// Column doesn't have RDF
					// TODO: Only case is a "mixed" address
				}
			}

			/*
			 * Add the RDF to the schema
			 */
			rootNode.links.push(vcardObj);
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
		 * makeVCardFragment
		 * 
		 * Returns part of the RDF plugin's schema for a fragment of a vCard
		 * address.
		 */
		makeVCardFragment : function(colName, uri, curie) {

			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-literal",
						"expression" : "value",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			}

			return o;
		},

		/*
		 * makeOSPCFragment
		 * 
		 * Constructs the RDF object for describing a postcode.
		 * 
		 * There's noticeably two levels to the object as we also give the postcode a label.
		 */
		makeOSPCFragment : function(colName, uri, curie, pcodeURI) {

			//log("makeOSPCFragment");

			var self = this;

			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "escape(\"" + pcodeURI + "\"+value.replace(\" \",\"\"),'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false,
						"rdfTypes" : [

						              ],
						              "links" : [ {
						            	  "uri" : self.vars.vocabs.rdfs.uri+"label",
						            	  "curie" : self.vars.vocabs.rdfs.curie+":label",
						            	  "target" : {
						            		  "nodeType" : "cell-as-literal",
						            		  "expression" : "escape(value,'xml')",
						            		  "columnName" : colName,
						            		  "isRowNumberCell" : false
						            	  }
						              } ]
					}
			};

			return o;
		},

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {
			var self = this;
			alert("Address wizard failed.\n\n" + message);
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.addressBody);
			LG.showWizardProgress(false);
			self.vars.addressName = "";
		},

		/*
		 * Updates Refine and returns the wizard's UI to its original state.
		 * Usually called after we've saved the RDF.
		 */
		onComplete : function() {

			var self = this;

			Refine.update({
				modelsChanged : true
			}, function() {
				//log("Finished address wizard");
				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.addressBody);
				LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.addressBody);
				$(window).resize();
				LG.showWizardProgress(false);
				self.vars.addressName = "";
			});
		},

		/*
		 * prepareColumnObjectsForValueTest
		 * 
		 * Stores the variables needed to run the 'unexpected values' test on the columns
		 * inside each of the column objects and returns the colObjects array.
		 * 
		 * Variables:
		 * 
		 * - unexpectedValueRegex
		 * - expectedType
		 * - exampleValue
		 */
		prepareColumnObjectsForValueTest:function(){

			//log("prepareColumnObjectsForValueTest");

			var self = this;

			var colObjects = self.vars.colObjects;

			for(var i=0;i<colObjects.length;i++){

				/*
				 * Test unexpeceted values on the new "address" column that has
				 * been created.
				 */
				if(self.vars.colObjects[i].part == "postcode"){

					//log("Testing unexpected values on column: "+colObjects[i].name);

					colObjects[i].unexpectedValueParams = {
							expression : self.vars.unexpectedValueRegex,
							colName : colObjects[i].name,
							expectedType : "postcode",
							exampleValue : "NW51PL"
					};

					if(self.vars.colObjects.length == 1 && self.vars.colObjects[0].part == "postcode"){
						colObjects[i].unexpectedValueParams.exampleValue = "NW52QT";
					}	
				}
			}

			return colObjects;

		},

		/*
		 * rerunWizard
		 */
		rerunWizard: function(){
			/*
			 * Empty function
			 * 
			 * During the 'unexpected values' test, some wizards need to 
			 * re-run certain operations in order to fix and transform the values 
			 * back to the state where they can be tested to see if those values 
			 * are expected or not.
			 * 
			 * The address wizard does not need to in this case.
			 */
		}

};