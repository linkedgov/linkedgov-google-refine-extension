

/*
 * latLongWizard
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
 * makeFragmentRDF
 * 
 * saveRDF
 * 
 * 
 */
LinkedGov.latLongWizard = {

		vars : {
			elmts : {},
			colObjects : [],
			vocabs : {
				geo : {
					curie : "geo",
					uri : "http://www.w3.org/2003/01/geo/wgs84_pos#"
				},
				spatialrelations : {
					curie : "spatialrelations",
					uri : "http://data.ordnancesurvey.co.uk/ontology/spatialrelations/"
				}
			}
		},

		/*
		 * 
		 */
		initialise : function(elmts) {

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			/*
			 * Build the fragment/column array and check if a postcode has been
			 * selected, in which case perform a regex match to verify.
			 */
			self.vars.colObjects = self.buildColumnObjects();

			log('self.vars.colObjects:');
			log(self.vars.colObjects);

			LinkedGov.checkSchema(self.vars.vocabs, function(rootNode,
					foundRootNode) {
				self.saveRDF(rootNode, foundRootNode);
			});

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
			if ($(self.vars.elmts.latLongColumns).children("li").length > 0) {
				$(self.vars.elmts.latLongColumns).children("li").each(function() {
					var el = $(this);
					/*
					 * Skip any columns that have been removed
					 */
					if (!$(this).hasClass("skip")) {
						array.push({
							type : el.find("select").val(),
							name : el.find("span.col").html()
						});
					}
				});

				return array;
			} else {
				return array;
			}
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

			var uri, curie = "";

			var obj = {
					"uri" : "http://example.linkedgov.org/location",
					"curie" : "lg:location",
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "value+\"#point\"",
						"isRowNumberCell" : true,
						"rdfTypes" : [ {
							"uri" : "http://www.w3.org/2003/01/geo/wgs84_pos#Point",
							"curie" : "geo:Point"
						} ],
						"links" : []
					}
			};

			/*
			 * Loop through the fragments, the type value can be:
			 *  - postcode (make an OSPC RDF fragment) - street-address -
			 * extended-address - postal-code - locality - country-name
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				var links = rootNode.links;

				for ( var j = 0; j < links.length; j++) {

					if (typeof links[j].target != 'undefined'
						&& links[j].target.columnName == colObjects[i].name) {
						/*
						 * Found existing RDF for the column, so remove it.
						 */
						log("Found lat-long RDF data for column: \""
								+ colObjects[i].name + "\", removing ...");
						links.splice(j, 1);
						j--;
					}

				}

				var vocabs = self.vars.vocabs;

				switch (colObjects[i].type) {
				case "long":
					/*
					 * Create the longitude RDF
					 */
					uri = vocabs.geo.uri + colObjects[i].type;
					curie = vocabs.geo.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeFragmentRDF(colObjects[i].name,
							uri, curie));

					break;
				case "lat":
					/*
					 * Create the latitude RDF
					 */
					uri = vocabs.geo.uri + colObjects[i].type;
					curie = vocabs.geo.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeFragmentRDF(colObjects[i].name,
							uri, curie));

					break;
				case "northing":
					/*
					 * Create the northing RDF
					 */
					uri = vocabs.spatialrelations.uri + colObjects[i].type;
					curie = vocabs.spatialrelations.curie + ":"
					+ colObjects[i].type;
					obj.target.links.push(self.makeFragmentRDF(colObjects[i].name,
							uri, curie));

					break;
				case "easting":
					/*
					 * Create the easting RDF
					 */
					uri = vocabs.spatialrelations.uri + colObjects[i].type;
					curie = vocabs.spatialrelations.curie + ":"
					+ colObjects[i].type;
					obj.target.links.push(self.makeFragmentRDF(colObjects[i].name,
							uri, curie));

					break;
				default:
					break;
				}

			}

			rootNode.links.push(obj);

			var schema = LinkedGov.getRDFSchema();

			if (!newRootNode) {
				log("rootNode has already been updated...");
			} else {
				log("Adding first rootNode for lat-long data...");
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
		 * Returns part of the RDF plugin's schema for a fragment of a vCard
		 * address.
		 */
		makeFragmentRDF : function(colName, uri, curie) {

			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#float",
						"expression" : "value",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			return o;
		},

		onFail : function() {
			var self = this;
			alert("Geolocation wizard failed.\n\n" + message)
			LinkedGov.resetWizard(self.vars.elmts.latLongBody);
			LinkedGov.showWizardProgress(false);
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete : function() {
			var self = this;
			Refine.update({
				everythingChanged : true
			}, function() {
				LinkedGov.resetWizard(self.vars.elmts.latLongBody);
				// Add typed class to column headers
				LinkedGov.showWizardProgress(false);
			});
		}
};
