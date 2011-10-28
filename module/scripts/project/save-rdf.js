
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
 * This function scans the RDF schema for any existing RDF prefix mappings, 
 * deletes them, and replaces them with the ones from the wizard.
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
	 * Construct an array of namespaces
	 */
	$.each(vocabs, function(k, v) {

		namespaces.push(v.curie);

		for ( var i = 0; i < schema.prefixes.length; i++) {
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

	// var rootNode = LinkedGov.findExistingRDF(schema,namespaces);

	/*
	 * Check to see if any RDF exists already.
	 */
	if (schema.rootNodes.length > 0) {
		for ( var i = 0; i < schema.rootNodes.length; i++) {
			log(schema.rootNodes[i]);
			if (typeof schema.rootNodes[i].isRowNumberCell != 'undefined'
				&& schema.rootNodes[i].isRowNumberCell === true) {
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
LinkedGov.renameColumnInRDF = {

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

			if (typeof theProject.overlayModels != 'undefined'
				&& typeof theProject.overlayModels.rdfSchema != 'undefined') {

				var schema = theProject.overlayModels.rdfSchema;

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
LinkedGov.finaliseRDFSchema = {

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
			 * Apply the row label and description
			 */
			self.saveRowClass(function() {
				self.saveColumnsAsProperties(function() {
					LinkedGov.checkSchema(self.vars.vocabs, function(rootNode,
							foundRootNode) {

						var camelizedRowLabel = LinkedGov
						.camelize(self.vars.rowLabel);

						rootNode.rdfTypes = [ {
							uri : self.vars.vocabs.lg.uri + camelizedRowLabel,
							curie : self.vars.vocabs.lg.curie + ":"
							+ camelizedRowLabel,
						} ];

						self.saveRDF(rootNode, foundRootNode);

					});
				})
			})

		},

		/*
		 * saveRowClass
		 * 
		 * Add another rootNode.
		 */
		saveRowClass : function(callback) {

			var self = this;

			var schema = LinkedGov.getRDFSchema();

			var camelizedRowLabel = LinkedGov
			.camelize(LinkedGov.vars.labelsAndDescriptions.rowLabel);

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

			schema.rootNodes.push(rootNode);

			callback();

		},

		/*
		 * 
		 */
		saveColumnsAsProperties : function(callback) {

			var self = this;
			var cols = LinkedGov.vars.labelsAndDescriptions.cols;
			var schema = LinkedGov.getRDFSchema();

			for ( var i = 0; i < cols.length; i++) {

				/*
				 * Add the owl:ObjectProperty statements for the columns.
				 */
				var rootNode = {
						nodeType : "resource",
						rdfTypes : [ {
							curie : "owl:ObjectProperty",
							uri : "http://www.w3.org/2002/07/owl#ObjectProperty"
						} ],
						value : "http://example.linkedgov.org/example-dataset/terms/"
							+ LinkedGov.camelize(cols[i].name),
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
				 * Add the column description.
				 */
				if (cols[i].description.length > 2
						&& cols[i].description != "Enter a description...") {
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

				schema.rootNodes.push(rootNode);

				if (i == cols.length - 1) {
					callback();
				}
			}

		},

		saveRDF : function(rootNode, newRootNode) {

			var self = this;

			$("td.column-header").each(function() {
				if ($(this).find("span.column-header-name").html() != "All" && !$(this).hasClass("typed")) {

					log("\""+ $(this).find("span.column-header-name").html()
							+ "\" has no RDF, generating generic RDF for it.");

					var camelizedColumnName = LinkedGov.camelize($(this).find("span.column-header-name").html());


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
 * time the table updates, a check is made to see if any columns 
 * have been used to produce RDF.
 * 
 * The RDF schema is traveresed to pick out the column names, those
 * column names are then used to apply a visual RDF marker in the data 
 * table to indicate which columns have RDF about them.
 */
LinkedGov.applyTypeIcons = {

		/*
		 * Uses data stored in the RDF schema object to apply the RDF symbols to
		 * columns that have RDF data.
		 */
		init : function() {

			var myUpdate = Refine.update;

			Refine.update = function(options, callback) {
				var theCallback = callback;
				var theOptions = options;
				var myCallback = function() {
					LinkedGov.applyTypeIcons.apply();
					theCallback();
				}
				myUpdate(theOptions, myCallback);
			}

		},

		apply : function() {

			log("Applying type icons...");

			var self = this;
			if (typeof theProject.overlayModels != 'undefined'
				&& typeof theProject.overlayModels.rdfSchema != 'undefined'
					&& $("td.column-header").length > 0) {
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
								$.each(theProject.overlayModels.rdfSchema,
										function(key, val) {
									self.recursiveFunction(key, val)
								});
							}
						}, 100);
			}
		},

		recursiveFunction : function(key, val) {
			var self = this;
			self.actualFunction(key, val);
			if (val instanceof Object) {
				$.each(val, function(key, value) {
					self.recursiveFunction(key, value)
				});
			}
		},

		actualFunction : function(key, val) {

			//log(key+" : "+val);

			if (key == "columnName") {
				$("td.column-header").each(function() {
					if ($(this).find("span.column-header-name").html().toLowerCase() == val.toLowerCase()) {
						$(this).addClass("typed");
					}
				});
			} else if(key == "curie"){
				$("td.column-header").each(function() {		
					if (val.toLowerCase().split(":")[1] == $(this).find("span.column-header-name").html().toLowerCase()) {
						$(this).addClass("typed");
					}
				});
			}



		}

};
