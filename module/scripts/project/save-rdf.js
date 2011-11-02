/*
 * LinkedGov extension for Google Refine
 * Author: Dan Smith
 * 
 * save-rdf.js
 * 
 * Functions and operations that allow the wizards to save RDF to 
 * the RDF schema.
 * 
 */


/*
 * getRDFSchema
 * 
 * Returns the RDF plugin schema (if there is one), otherwise returns our
 * skeleton of the schema to begin the first RDF operations on.
 */
LinkedGov.getRDFSchema = function() {
	
	if (typeof theProject.overlayModels != 'undefined'
		&& typeof theProject.overlayModels.rdfSchema != 'undefined') {
		LinkedGov.vars.rdfSchema = theProject.overlayModels.rdfSchema;
		return theProject.overlayModels.rdfSchema;
	} else {
		return LinkedGov.vars.rdfSchema;
	}
	
}

/*
 * checkSchema
 * 
 * Called when a wizard saves it's RDF.
 * 
 * The function scans the RDF schema for any existing RDF vocabulary prefixes and
 * makes sure the wizards RDF vocabulary prefixes are stored in the schema.
 * 
 * It also checks to see if a root node already exists in the schema, which if 
 * it does, returns the root node, and if it doesn't, create a blank root node and 
 * returns that instead.
 * 
 */
LinkedGov.checkSchema = function(vocabs, callback) {

	log("Checking Schema");

	var self = this;
	var schema = LinkedGov.getRDFSchema();
	var namespaces = [];

	/*
	 * Loop through the wizard's vocabularies and make 
	 * sure they all exist in the RDF schema.
	 */
	$.each(vocabs, function(k, v) {

		for (var i = 0; i < schema.prefixes.length; i++) {
			if (schema.prefixes[i].name == v.curie) {
				// log("Found existing RDF prefixes, removing...");
				schema.prefixes.splice(i, 1);
				i--;
			}
		}

		schema.prefixes.push({
			name : v.curie,
			uri : v.uri
		});

	});

	/*
	 * Check to see if a root node exists for the rows already by checking 
	 * that the "isRowNumberCell" key is set to true (meaning this root node is
	 * describing the rows).
	 * 
	 * Handles if there are no root nodes and if there are root nodes but none contain 
	 * the correct key-value.
	 */
	if (schema.rootNodes.length > 0) {
		
		for ( var i = 0; i < schema.rootNodes.length; i++) {

			if (typeof schema.rootNodes[i].isRowNumberCell != 'undefined' && schema.rootNodes[i].isRowNumberCell === true) {
				callback(schema.rootNodes[i], false);
			} else if (i == schema.rootNodes.length - 1) {
				rootNode = {
						"nodeType" : "cell-as-resource",
						"expression" : "value",
						"isRowNumberCell" : true,
						"rdfTypes" : [],
						"links" : []
				};
				callback(rootNode, true);
			}
		}
		
	} else {
		rootNode = {
				"nodeType" : "cell-as-resource",
				"expression" : "value",
				"isRowNumberCell" : true,
				"rdfTypes" : [],
				"links" : []
		};
		callback(rootNode, true);
	}

}

/*
 * renameColumnInRDF
 * 
 * Called whenever a column-rename operation occurs. If a column is renamed in 
 * Refine *after* RDF has been produced for it, it's old name remains in the RDF.
 * This function traverses the RDF schema and finds the column name that has 
 * been changed and changes it to it's new name.
 */
var renameColumnInRDF = {

		vars : {
			oldName : "",
			newName : "",
			callback : {}
		},

		start : function(oldName, newName, callback) {
			var self = this;
			self.vars.oldName = oldName;
			self.vars.newName = newName;
			self.vars.callback = callback;

			/*
			 * Make sure the schema exists before attempting to rename 
			 * the column names it contains.
			 */
			if (typeof theProject.overlayModels != 'undefined'
				&& typeof theProject.overlayModels.rdfSchema != 'undefined') {

				var schema = theProject.overlayModels.rdfSchema;

				/*
				 * Traverse the JSON tree recursively, executing our 
				 * recursive function that tests if it's found a column name.
				 */
				$.each(schema, function(key, val) {
					self.recursiveFunction(key, val);
				});

				/*
				 * Save the RDF.
				 */
				Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
					schema : JSON.stringify(schema)
				}, {}, {
					onDone : function() {
						log("Finished");
						callback();
					}
				});
			} else {
				callback();
				return false;
			}

		},

		/*
		 * Check if we've found a column name, check if it's the one 
		 * we need to rename, rename it.
		 */
		recursiveFunction : function(key, val) {
			var self = this;
			// self.actualFunction(key, val);

			if (val instanceof Object) {
				if (typeof val.columnName != 'undefined') {
					log("Found something containing a columnName key");
					log(val);
					if (val.columnName == self.vars.oldName) {
						log("Changing " + val.columnName + " - to: "
								+ self.vars.newName);
						val.columnName = self.vars.newName;
					}
				}
				$.each(val, function(key, value) {
					self.recursiveFunction(key, value)
				});
			}
		}

};

/*
 * finaliseRDFSchema
 * 
 * Called once the "Labels and Descriptions" panel is completed.
 * 
 * For any columns that do not have RDF stored, this function saves 
 * their values in RDF using the column name as the property name.
 */
var finaliseRDFSchema = {

		vars : {
			vocabs : {
				lg : {
					curie : "lg",
					uri : "http://example.linkedgov.org/"
				}
			}
		},

		/*
		 * Check which column headers don't have the "typed" class.
		 */
		init : function() {

			var self = this;

			self.vars.cols = LinkedGov.vars.labelsAndDescriptions.cols;
			self.vars.rowLabel = LinkedGov.vars.labelsAndDescriptions.rowLabel;
			self.vars.rowDescription = LinkedGov.vars.labelsAndDescriptions.rowDescription;

			/*
			 * Chain together a series of save operations using callback functions.
			 * 
			 * saveRowClass - save the owl:Class description for the row.
			 */
			self.saveRowClass(function() {
				/*
				 * saveColumnsAsProperties - save the owl:ObjectProperty descriptions for the columns
				 */
				self.saveColumnsAsProperties(function() {
					/*
					 * Check for/create a root node for column RDF in the schema.
					 */
					LinkedGov.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {

						var camelizedRowLabel = LinkedGov.camelize(self.vars.rowLabel);

						/*
						 * Camelize the row label that's been entered and type the root node (each row) 
						 * as the label. E.g. "Each row is a lg:utilityReading".
						 */
						rootNode.rdfTypes = [ {
							uri : self.vars.vocabs.lg.uri + camelizedRowLabel,
							curie : self.vars.vocabs.lg.curie + ":"
							+ camelizedRowLabel,
						} ];

						/*
						 * Save the RDF for the columns that were not involved in any wizard
						 * operations.
						 */
						self.saveGenericColumnRDF(rootNode, foundRootNode);

					});
				})
			})

		},

		/*
		 * saveRowClass
		 * 
		 * Creates the owl:Class description for the rows.
		 */
		saveRowClass : function(callback) {

			var self = this;

			var schema = LinkedGov.getRDFSchema();

			var camelizedRowLabel = LinkedGov.camelize(LinkedGov.vars.labelsAndDescriptions.rowLabel);

			/*
			 * Exists in the schema as it's own root node, so we create one here 
			 * with a label and a comment.
			 */
			var rootNode = {
					links : [ {
						curie : "rdfs:label",
						target : {
							lang : "en",
							nodeType : "literal",
							value : LinkedGov.vars.labelsAndDescriptions.rowLabel
						},
						uri : "http://www.w3.org/2000/01/rdf-schema#label"
					}, {
						curie : "rdfs:comment",
						target : {
							lang : "en",
							nodeType : "literal",
							value : LinkedGov.vars.labelsAndDescriptions.rowDescription
						},
						uri : "http://www.w3.org/2000/01/rdf-schema#comment"
					} ],
					nodeType : "resource",
					rdfTypes : [ {
						curie : "owl:Class",
						uri : "http://www.w3.org/2002/07/owl#Class"
					} ],
					value : "http://example.linkedgov.org/example-dataset/terms/"
						+ camelizedRowLabel
			};

			/*
			 * Add the root node to the schema.
			 */
			schema.rootNodes.push(rootNode);

			callback();

		},

		/*
		 * saveColumnsAsProperties 
		 * 
		 * Creates the owl:ObjectProperty descriptions for the columns.
		 */
		saveColumnsAsProperties : function(callback) {

			var self = this;
			var cols = LinkedGov.vars.labelsAndDescriptions.cols;
			var schema = LinkedGov.getRDFSchema();

			/*
			 * Loop through the column label objects created by the labels and descriptions panel.
			 */
			for (var i = 0; i < cols.length; i++) {

				/*
				 * Add the owl:ObjectProperty statements for the columns which each exist
				 * as their own root nodes.
				 */
				var rootNode = {
						nodeType : "resource",
						rdfTypes : [ {
							curie : "owl:ObjectProperty",
							uri : "http://www.w3.org/2002/07/owl#ObjectProperty"
						} ],
						value : "http://example.linkedgov.org/example-dataset/terms/" + LinkedGov.camelize(cols[i].name),
							links : [ {
								curie : "rdfs:label",
								target : {
									lang : "en",
									nodeType : "literal",
									value : cols[i].name
								},
								uri : "http://www.w3.org/2000/01/rdf-schema#label"
							} ]
				}

				/*
				 * Add the column description separately in case the user hasn't entered a 
				 * description for the column.
				 */
				if (cols[i].description.length > 2 && cols[i].description != "Enter a description...") {
					rootNode.links.push({
						curie : "rdfs:comment",
						target : {
							lang : "en",
							nodeType : "literal",
							value : cols[i].description
						},
						uri : "http://www.w3.org/2000/01/rdf-schema#comment"
					})
				}

				/*
				 * Add the root node to the schema.
				 */
				schema.rootNodes.push(rootNode);

				if (i == cols.length - 1) {
					callback();
				}
			}

		},

		/*
		 * saveGenericColumnRDF
		 * 
		 * Creates the generic RDF for each column that wasn't involved in 
		 * any of the wizards using the column name as the property for the rows.
		 */
		saveGenericColumnRDF : function(rootNode, newRootNode) {

			var self = this;

			/*
			 * Loop through the column header elements of the data table and check for any 
			 * headers that haven't been given the RDF "typed" class (that indicates RDF exists for them).
			 * 
			 * If the column doesn't have an indicator, then produce generic RDF for it and add it to the existing root
			 * node for the wizard column RDF.
			 */
			$("td.column-header").each(function() {
				if ($(this).find("span.column-header-name").html() != "All" && !$(this).hasClass("typed")) {

					log("\""+ $(this).find("span.column-header-name").html() + "\" has no RDF, generating generic RDF for it.");

					var camelizedColumnName = LinkedGov.camelize($(this).find("span.column-header-name").html());

					/*
					 * Default description is: <Row> <lg:columnName> "cell value"
					 */
					var o = {
							"uri" : self.vars.vocabs.lg.uri + camelizedColumnName,
							"curie" : self.vars.vocabs.lg.curie + ":" + camelizedColumnName,
							"target" : {
								"nodeType" : "cell-as-literal",
								"expression" : "value",
								"columnName" : $(this).find("span.column-header-name").html(),
								"isRowNumberCell" : false
							}
					};

					/*
					 * Detect and specify types & language for the generic RDF about columns.
					 * 
					 * The @en tag is specified for *any* string value, i.e. "14:00:00" and "12/10/2010".
					 */
					if(typeof theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v == "number"){
						if(theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v % 1 == 0){
							o.target.valueType = "http://www.w3.org/2001/XMLSchema#int";
						} else {
							o.target.valueType = "http://www.w3.org/2001/XMLSchema#float";
						}
					} else if(typeof theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v == "string"){
						o.target.lang = "en";
					}

					rootNode.links.push(o);
				}
			});

			/*
			 * Check to see if the root node needs to be added to the schema.
			 */
			var schema = LinkedGov.getRDFSchema();

			if (!newRootNode) {
				log("rootNode has already been updated...");
			} else {
				log("Adding first rootNode for generic column RDF...");
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
					Refine.update({
						everythingChanged : true
					});
				}
			});
		}
};


/*
 * applyTypeIcons
 * 
 * Overwrites the default update function in Refine so that every 
 * time the data table updates, a check is made to see if any columns 
 * have been used to produce RDF and adds the CSS class "typed" to display 
 * the RDF symbol.
 * 
 * The RDF schema is traversed to pick out the column names, those
 * column names are then used to apply a visual RDF marker in the data 
 * table to indicate which columns have RDF about them.
 */
var applyTypeIcons = {


		/*
		 * Overwrite the Refine update function with our callback.
		 */
		init : function() {

			var lgUpdate = Refine.update;

			Refine.update = function(options, callback) {
				var theCallback = callback;
				var theOptions = options;
				var lgCallback = function() {
					LinkedGov.applyTypeIcons.apply();
					theCallback();
				}
				lgUpdate(theOptions, lgCallback);
			}

		},

		/*
         * Make sure the schema exists and the data table has loaded (which sometimes it hasn't). 
         * If it hasn't set an interval to check the data table is loaded before applying the 
         * RDF symbols to the columns.
		 */
		apply : function() {

			//log("Applying type icons...");

			var self = this;
			if (typeof theProject.overlayModels != 'undefined' && 
					typeof theProject.overlayModels.rdfSchema != 'undefined' && 
						$("td.column-header").length > 0) {
				
				$.each(theProject.overlayModels.rdfSchema, function(key, val) {
					self.recursiveFunction(key, val);
				});
				
			} else {
				var t = setInterval(
						function() {
							if ($("td.column-header").length > 0
									&& typeof theProject.overlayModels != 'undefined'
										&& typeof theProject.overlayModels.rdfSchema != 'undefined') {
								clearInterval(t);
								$.each(theProject.overlayModels.rdfSchema, function(key, val) {
									self.recursiveFunction(key, val)
								});
							}
						}, 100);
			}
		},

		/*
		 * Traverse through the schema tree and check for any column names existing as direct "columnName" 
		 * values or as camelized versions within the CURIE properties of descriptions.
		 * 
		 * If there's a column name, find that column name in the data table header 
		 * and apply the CSS class "typed" to display the RDF symbol.
		 */
		recursiveFunction : function(key, val) {
			
			var self = this;
			
			if (key == "columnName") {
				$("td.column-header").each(function() {
					if ($(this).find("span.column-header-name").html().toLowerCase() == val.toLowerCase()) {
						$(this).addClass("typed");
					}
				});
			} else if(key == "curie"){
				$("td.column-header").each(function() {		
					if (val.toLowerCase().split(":")[1] == LinkedGov.camelize($(this).find("span.column-header-name").html().toLowerCase())) {
						$(this).addClass("typed");
					}
				});
			}
			
			if (val instanceof Object) {
				$.each(val, function(key, value) {
					self.recursiveFunction(key, value)
				});
			}
		}

};
