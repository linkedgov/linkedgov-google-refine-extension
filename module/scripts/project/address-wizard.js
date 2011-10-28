
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
 * address, in which case typing is applied to the columns.
 * 
 * initialise
 * 
 * getFragments
 * 
 * checkPostCode
 * 
 * makeOSPCFragment
 * 
 * makeVCardFragment
 * 
 * saveRDF
 * 
 * 
 */
LinkedGov.addressWizard = {

		/*
		 * Regex obtained from Wikipedia:
		 * http://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Validation
		 * 
		 * Modified to account for a space in the middle of postcodes: "Z]?{0" to
		 * "Z]? {0".
		 */
		vars : {
			elmts : {},
			postCodeRegex : "[A-Z]{1,2}[0-9R][0-9A-Z]? {0,1}[0-9][ABD-HJLNP-UW-Z]{2}",
			colObjects : [],
			vocabs : {
				vcard : {
					curie : "vcard",
					uri : "http://www.w3.org/2006/vcard/ns#"
				},
				rdfs : {
					curie : "rdfs",
					uri : "http://www.w3.org/2000/01/rdf-schema#"
				},
				ospc : {
					curie : "ospc",
					uri : "http://data.ordnancesurvey.co.uk/ontology/postcode/",
					resourceURI : "http://data.ordnancesurvey.co.uk/id/postcodeunit/"
				}
			}
		},

		/*
		 * 
		 */
		initialise : function(elmts) {

			var self = this;
			self.vars.elmts = elmts;

			/*
			 * Build an array of column objects with their options
			 * 
			 * {name - column name part - the specified address part
			 * containsPostcode - boolean is user has specified the column contains
			 * a post code.}
			 */
			self.vars.colObjects = self.buildColumnObjects();

			if (self.vars.colObjects.length > 0) {

				LinkedGov.showWizardProgress(true);

				// log('self.vars.colObjects:');
				// log(self.vars.colObjects);

				/*
				 * Build rdf fragments
				 */
				var index = 0;

				self.validatePostCodeColumns(index, function() {
					/*
					 * Check and build postcode fragment
					 */
					self.createRdfFragments(function() {
						/*
						 * Save rdf
						 */
						LinkedGov.checkSchema(self.vars.vocabs, function(rootNode,
								foundRootNode) {
							self.saveRDF(rootNode, foundRootNode);
						});
					});
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

			log("buildColumnObjects");

			var self = this;
			var array = [];

			/*
			 * If there are columns that have been selected
			 */
			if ($(self.vars.elmts.addressColumns).children("li").length > 0) {
				$(self.vars.elmts.addressColumns).children("li").each(
						function() {
							var el = $(this);
							/*
							 * Skip any columns that have been removed
							 */
							if (!$(this).hasClass("skip")) {

								array.push({
									name : el.find("span.col").html(),
									part : el.find("select").val(),
									containsPostcode : el.find(
									"input.postcode[type='checkbox']")
									.attr("checked")
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
		 * Asks the user for a new column name (to name the column with the newly
		 * extracted postcode) and creates a new column based on extracting the
		 * postcode from the column the user has selected.
		 * 
		 */
		validatePostCodeColumns : function(index, callback) {

			var self = this;
			var colObjects = self.vars.colObjects;
			var i = index;

			// log("validatePostcode, recursing, colObjects.length =
			// "+colObjects.length+", i = "+i);
			// log(colObjects[i].name+" : "+colObjects[i].part+" :
			// "+colObjects[i].containsPostcode);

			if (i >= colObjects.length) {
				callback();
			} else if (colObjects[i].containsPostcode
					|| colObjects[i].part == "postcode") {

				/*
				 * The expression ends with "[1]" so we grab the middle element (the
				 * postcode value) of the returned 3-part regex result.
				 */

				log(colObjects[i].name);
				log(Refine.columnNameToColumnIndex(colObjects[i].name) + 1);

				Refine
				.postCoreProcess(
						"add-column",
						{
							baseColumnName : colObjects[i].name,
							expression : "partition(value,/"
								+ self.vars.postCodeRegex + "/)[1]",
								newColumnName : colObjects[i].name
								+ " Postcode (LG)",
								columnInsertIndex : Refine
								.columnNameToColumnIndex(colObjects[i].name) + 1,
								onError : "keep-original"
						},
						null,
						{
							modelsChanged : true
						},
						{
							onDone : function() {

								/*
								 * if the column selected had other address
								 * parts in it, then we don't want to remove
								 * it.
								 */
								if (colObjects[i].part == "mixed") {

									colObjects.splice(colObjects.length, 0,
											{
										name : colObjects[i].name
										+ " Postcode (LG)",
										part : "postcode",
										containsPostcode : true
											});

									i++;
									if (colObjects.length == 2) {
										callback();
									} else {
										self.validatePostCodeColumns(i,
												callback);
									}

								} else {
									// Remove the old postcode column
									LinkedGov
									.silentProcessCall({
										type : "POST",
										url : "/command/" + "core"
										+ "/"
										+ "remove-column",
										data : {
											columnName : colObjects[i].name
										},
										success : function() {

											// Rename new column to
											// old column name
											LinkedGov
											.silentProcessCall({
												type : "POST",
												url : "/command/"
													+ "core"
													+ "/"
													+ "rename-column",
													data : {
														oldColumnName : colObjects[i].name
														+ " Postcode (LG)",
														newColumnName : colObjects[i].name
													},
													success : function() {

														/*
														 * Create
														 * a new
														 * column
														 * object
														 * and
														 * return
														 * it.
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
														self
														.validatePostCodeColumns(
																i,
																callback);

														/*
														 * Call
														 * the
														 * callback
														 * if
														 * we've
														 * processed
														 * each
														 * of
														 * the
														 * column
														 * objects.
														 */

													},
													error : function() {
														self
														.onFail("A problem was encountered when renaming the column: \""
																+ colObjects[i].name
																+ " Postcode (LG)\".");
													}
											});
										},
										error : function() {
											self
											.onFail("A problem was encountered when removing the column: \""
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
		 * createRdfFragments
		 */
		createRdfFragments : function(callback) {

			log("createRdfFragments");
			var self = this;
			var colObjects = self.vars.colObjects;

			/*
			 * Store the URIs & namespaces
			 */

			var rdfsURI = "http://www.w3.org/2000/01/rdf-schema#";
			var rdfsCURIE = "";
			var vcardURI = "http://www.w3.org/2006/vcard/ns#";
			var vcardCURIE = "vcard";
			var ospcURI = "http://data.ordnancesurvey.co.uk/ontology/postcode/";
			var ospcCURIE = "ospc";
			var ospcResourceURI = "http://data.ordnancesurvey.co.uk/id/postcodeunit/";

			var uri, curie = "";

			/*
			 * Loop through the colObject parts, which can be:
			 *  - postcode (make an OSPC RDF fragment) - street-address -
			 * extended-address - postal-code - locality - country-name
			 */

			for ( var i = 0; i <= colObjects.length; i++) {

				if (i == colObjects.length) {
					callback();
				} else {

					switch (colObjects[i].part) {

					case "mixed":

						// TODO: What to store if mixed address?
						log("mixed fragment");
						log(colObjects[i]);

						break;

					case "postcode":

						/*
						 * Create the vCard postcode RDF
						 */
						uri = vcardURI + colObjects[i].part;
						curie = vcardCURIE + ":" + colObjects[i].part;
						colObjects[i].rdf = self.makeVCardFragment(
								colObjects[i].name, uri, curie);
						/*
						 * Create the OSPC postcode RDF
						 */
						uri = ospcURI + colObjects[i].part;
						curie = ospcCURIE + ":" + colObjects[i].part;
						colObjects[i].ospcRdf = self.makeOSPCFragment(
								colObjects[i].name, uri, curie, ospcResourceURI);
						break;

					default:

						/*
						 * Create the other vCard address fragments
						 */
						uri = vcardURI + colObjects[i].part;
					curie = vcardCURIE + ":" + colObjects[i].part;
					colObjects[i].rdf = self.makeVCardFragment(
							colObjects[i].name, uri, curie);
					break;

					}
				}

			}

		},

		/*
		 * saveRDF
		 * 
		 * Figures out what address fragments there are to save and saves them.
		 * 
		 * The passed 'fragments' object should be in the form of key-value pairs,
		 * key = address fragment type value = column name
		 * 
		 * E.g. {type:street-address,name:col1},{type:city,name:col3}
		 */
		saveRDF : function(rootNode, newRootNode) {

			log("saveRDF");

			var self = this;
			var elmts = this.vars.elmts;

			var colObjects = self.vars.colObjects;

			/*
			 * Store the URIs & namespaces
			 */
			var rdfsURI = "http://www.w3.org/2000/01/rdf-schema#";
			var rdfsCURIE = "rdfs";
			var vcardURI = "http://www.w3.org/2006/vcard/ns#";
			var vcardCURIE = "vcard";
			var ospcURI = "http://data.ordnancesurvey.co.uk/ontology/postcode/";
			var ospcCURIE = "ospc";
			var ospcResourceURI = "http://data.ordnancesurvey.co.uk/id/postcodeunit/";

			/*
			 * The RDF plugin's schema object that's posted to the save-rdf-schema
			 * process.
			 * 
			 * Note the substition of the schemaFragmentArray variable as the last
			 * links value for the vCard Address.
			 * 
			 * This object declares that : - every row in the dataset is a vCard -
			 * every vCard has an address - every address has whatever address
			 * fragments the user has said exist in their data. - postcodes are
			 * stored using the OSPC description, given a resolvable URI and an
			 * rdfs:label.
			 */

			var vcardObj = {
					"uri" : "http://example.linkedgov.org/location",
					"curie" : "lg:location",
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "value+\"#address\"",
						"isRowNumberCell" : true,
						"rdfTypes" : [ {
							"uri" : "http://www.w3.org/2006/vcard/ns#Address",
							"curie" : "vcard:Address"
						} ],
						"links" : []
					}
			};

			/*
			 * Loop through the column objects and store their RDF in the schema.
			 * 
			 * We make sure we push the fragment RDF in as properties of the
			 * vCard:Address and not the bare row index.
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				if (colObjects[i].containsPostcode
						&& colObjects[i].part == "postcode") {
					vcardObj.target.links.push(colObjects[i].ospcRdf);
				}
				if (typeof colObjects[i].rdf != 'undefined') {
					vcardObj.target.links.push(colObjects[i].rdf);
				}
			}

			rootNode.links.push(vcardObj);

			var schema = LinkedGov.getRDFSchema();

			if (!newRootNode) {
				log("rootNode has already been updated...");
			} else {
				log("Adding first rootNode for lat-long data...");
				/*
				 * Create and type the row index "0/#point" as a geo:Point
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
					// DialogSystem.dismissUntil(self._level - 1);
					// theProject.overlayModels.rdfSchema = schema;
					self.onComplete();
				}
			});

		},

		/*
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
		 * Returns part of the RDF plugin's schema for a postcode using the OSPC
		 * ontology.
		 * 
		 * It has two levels to the object as we also give the postcode a label.
		 */
		makeOSPCFragment : function(colName, uri, curie, pcodeURI) {

			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "\"" + pcodeURI + "\"+value.replace(\" \",\"\")",
						"columnName" : colName,
						"isRowNumberCell" : false,
						"rdfTypes" : [

						              ],
						              "links" : [ {
						            	  "uri" : "http://www.w3.org/2000/01/rdf-schema#label",
						            	  "curie" : "rdfs:label",
						            	  "target" : {
						            		  "nodeType" : "cell-as-literal",
						            		  "expression" : "value",
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
		 */
		onFail : function(message) {
			var self = this;
			alert("Address wizard failed.\n\n" + message);
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
			LinkedGov.showWizardProgress(false);
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete : function() {
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
			Refine.update({
				modelsChanged : true
			}, function() {
				LinkedGov.showWizardProgress(false);
			});
		}
};