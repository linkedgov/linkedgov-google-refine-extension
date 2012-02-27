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
 */
var LinkedGov_measurementsWizard = {

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
		 * Builds the column objects and saves their RDF. 
		 */
		initialise : function(elmts) {

			var self = this;
			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}
			self.vars.elmts = elmts;
			
			/*
			 * Build the column objects
			 */
			self.vars.colObjects = self.buildColumnObjects();

			/*
			 * Check that a column has been selected and that a measurement 
			 * has been selected using the Freebase autosuggestion box.
			 */
			if (self.vars.colObjects.length > 0) {
				if (elmts.unitInputField.val().length > 0) {
					
					/*
					 * Display the "working..." sign
					 */
					LG.showWizardProgress(true);

					/*
					 * Save the RDF.
					 */
					LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
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
		 * buildColumnObjects
		 * 
		 * Build an array of {column name, measurement} objects
		 */
		buildColumnObjects : function() {
			
			var self = this;
			var elmts = self.vars.elmts;
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
			 * E.g. Returned by API: en/celsius
			 * However, we want the URI to look like this:
			 * http://rdf.freebase.com/ns/en.celsius 
			 * and the CURIE like this: 
			 * fb:celsius
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
			 * Loop through the column objects, check if there's existing RDF in the schema for 
			 * any of the columns, add/replace the newly generated RDF object.
			 */
			var schema = LG.rdfOps.getRDFSchema();

			var colObjects = self.vars.colObjects;

			for ( var i = 0; i < colObjects.length; i++) {

				var links = rootNode.links;

				/*
				 * Camel-case & trim whitespace to use as URI slug
				 */
				var camelColName = LG.camelize(colObjects[i].name);

				/*
				 * Check to see if there's an existing mapping for the column name
				 * already.
				 */
				for ( var j = 0; j < links.length; j++) {
					if (links[j].uri.indexOf(camelColName) > -1) {
						log("Found measurements RDF data for column: \""+ colObjects[i].name + "\", removing ...");
						links.splice(j, 1);
						j--;
					}
				}
				
				var expression = "grel:if(type(value) == 'number',(if(value % 1 == 0,'int','float')),if(((type(value.match(/\\b\\d{4}[\\-]\\d{1,2}[\\-]\\d{1,2}\\b/))=='array')),'date',if(isBlank(value),null,if(type(value.replace(',','').toNumber())=='number',(if(value % 1 == 0,'int','float')),'string'))))";

				/*
				 * Recursive function to compute a facet for each column to find 
				 * the most frequently occuring value type (int, float, string...)
				 */
				var type = LG.ops.findHighestFacetValue(colObjects[i].name,expression);

				//log("Finding type of measurement column...");
				//log("colObjects[i].name: "+colObjects[i].name);
				//log("type: "+type);
				
				LG.ops.parseValueTypesInColumn(type, colObjects[i].name);
				
				var o =  {
		            	  "uri" : uri,
		            	  "curie" : curie,
		            	  "target" : {
		            		  "nodeType" : "cell-as-literal",
		            		  "expression" : "value",
		            		  "columnName" : colObjects[i].name,
		            		  "isRowNumberCell" : false
		            	  }
		        };
				
				if(type == "string"){
					o.target.lang = "en";
				} else if(type == "int"){
					o.target.valueType = "http://www.w3.org/2001/XMLSchema#int";
				} else if(type == "float"){
					o.target.valueType = "http://www.w3.org/2001/XMLSchema#float";
				} else if(type == "date"){
					o.target.valueType = "http://www.w3.org/2001/XMLSchema#date";
				}

				rootNode.links.push({
					"uri" : "http://example.linkedgov.org/" + camelColName,
					"curie" : "lg:" + camelColName,
					"target" : {
						"nodeType" : "cell-as-blank",
						"isRowNumberCell" : true,
						"rdfTypes" : [],
						"links" : [o]
					}
				});

			} // end for

			var schema = LG.rdfOps.getRDFSchema();
			if (!newRootNode) {
				log("RootNode has been updated...");
			} else {
				log("Adding first rootNode...");
				schema.rootNodes.push(rootNode);
			}

			/*
			 * Save the RDF
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
			alert("Measurments wizard failed.\n\n" + message);
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.measurementsBody);
			LG.showWizardProgress(false);
		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete : function() {
			var self = this;
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.measurementsBody);
			LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.measurementsBody);
			LG.showWizardProgress(false);
		}

};
