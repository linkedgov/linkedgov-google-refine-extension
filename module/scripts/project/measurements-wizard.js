
/*
 * measurementsWizard
 * 
 * Allows the user to select a column for typing against a particular
 * measurement.
 * 
 * Once the user has selected a column, they are able to reconcile what type of
 * measurement it is against the Freebase database, by typing into an
 * autosuggestion box. The information returned by the Freebase API lets us
 * store a URI, label and class for the measurement.
 * 
 * initialise
 * 
 * saveRDF
 * 
 * 
 * 
 */
LinkedGov.measurementsWizard = {

		/*
		 * elmts: an object that contains the bound HTML elements for the
		 * measurements wizard panel.
		 */
		vars : {
			elmts : {},
			cols : [],
			colObjects : [],
			vocabs : {
				fb : {
					curie : "fb",
					uri : "http://rdf.freebase.com/rdf/"
				}
			}
		},

		/*
		 * The HTML input fields and options for the wizard are passed to the wizard
		 * object through the parameter "elmts" and are stored globally within the
		 * wizard.
		 * 
		 * Begins the wizard operation.
		 * 
		 */
		initialise : function(elmts) {
			var self = this;
			self.vars.elmts = elmts;
			self.vars.colObjects = self.buildColumnObjects(elmts);

			if (self.vars.colObjects.length > 0) {
				if (elmts.unitInputField.val().length > 0) {
					LinkedGov.showWizardProgress(true);

					LinkedGov.checkSchema(self.vars.vocabs, function(rootNode,
							foundRootNode) {
						self.saveRDF(rootNode, foundRootNode);
					});
				} else {
					alert("You need to search for a measurement type using the text box.");
				}
			} else {
				alert("You need to select a column and specify what type of measurement it contains.");
			}
		},

		/*
		 * 
		 */
		buildColumnObjects : function(elmts) {
			var array = [];
			$(elmts.measurementsColumns).find("span.col").each(function() {
				array.push({
					name : $(this).html(),
					measurement : elmts.unitInputField.val()
				});
			});

			return array;
		},

		/*
		 * Prepare the returned data from Freebase (measurement URI and label), and
		 * use the columns the user has selected to post an "RDF Schema" object to
		 * the RDF plugin extension.
		 */
		saveRDF : function(rootNode, newRootNode) {

			var self = this;
			var elmts = self.vars.elmts;

			/*
			 * E.g.
			 * 
			 * Returned by API: en/celsius
			 * 
			 * We want,
			 * 
			 * uri = http://rdf.freebase.com/ns/en.celsius curie = fb:celsius
			 * 
			 */

			var prefix = "fb";
			var namespaceURI = "http://rdf.freebase.com/rdf/";
			var uri = elmts.unitInputField.data("data.suggest").id;

			// Replacing the "/" with a "." in the returned slug for the measurement
			// to
			// prepare it for it's RDF location, which uses ".".
			uri = uri.replace(/\//g, ".");
			uri = namespaceURI + uri.substring(1, uri.length);

			var curie = uri.split(".");
			curie = curie[curie.length - 1];
			curie = prefix + ":" + curie;

			/*
			 * Loop through each of the selected columns (that are passed to the
			 * wizard through the elmts object, and create an RDF Schema JSON object
			 * for each of them, and store their measurement data in RDF).
			 */

			var schema = LinkedGov.getRDFSchema();

			var colObjects = self.vars.colObjects;

			for ( var i = 0; i < colObjects.length; i++) {

				var links = rootNode.links;

				/*
				 * Camel-case & trim whitespace to use as URI slug
				 */
				var camelColName = LinkedGov.camelize(colObjects[i].name);

				/*
				 * Check to see if there's an existing mapping for the column name
				 * already.
				 */
				for ( var j = 0; j < links.length; j++) {
					if (links[j].uri.indexOf(camelColName) > -1) {
						log("Found measurements RDF data for column: \""
								+ colObjects[i].name + "\", removing ...");
						links.splice(j, 1);
						j--;
					}
				}

				rootNode.links.push({
					"uri" : "http://example.linkedgov.org/" + camelColName,
					"curie" : "lg:" + camelColName,
					"target" : {
						"nodeType" : "cell-as-blank",
						"isRowNumberCell" : true,
						"rdfTypes" : [

						              ],
						              "links" : [ {
						            	  "uri" : uri,
						            	  "curie" : curie,
						            	  "target" : {
						            		  "nodeType" : "cell-as-literal",
						            		  "expression" : "value",
						            		  "valueType" : "http://www.w3.org/2001/XMLSchema#int",
						            		  "columnName" : colObjects[i].name,
						            		  "isRowNumberCell" : false
						            	  }
						              } ]
					}
				});

			} // end for

			var schema = LinkedGov.getRDFSchema();

			if (!newRootNode) {
				log("rootNode has already been updated...");
			} else {
				log("Adding first rootNode for lat-long data...");
				/*
				 * Create and type the row index "0/#point" as a geo:Point
				 */

				// var thing = window.prompt("What does each row symbolise?
				// (e.g. 'Energy reading')");
				/*
				 * TODO: This shouldn't be here - this should be asked at the end of
				 * the Typing process.
				 */
				rootNode.rdfTypes.push({
					"uri" : "http://example.linkedgov.org/EnergyReading",
					"curie" : "lg:EnergyReading"
				});

				schema.rootNodes.push(rootNode);
			}

			/*
			 * Save the RDF
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

		onFail : function(message) {
			var self = this;
			alert("Measurments wizard failed.\n\n" + message);
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
			LinkedGov.showWizardProgress(false);
		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete : function() {
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.measurementsBody);
			LinkedGov.showWizardProgress(false);
		}

};
