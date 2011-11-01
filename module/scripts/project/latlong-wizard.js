/*
 * latLongWizard
 * 
 * The user can specify if one or more columns contain a latitude, 
 * longitude, northing or easting.
 * 
 * After selecting the column(s), a select box is provided containing 
 * the geolocation types.
 * 
 */
var latLongWizard = {

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
				},
				lg : {
					curie: "lg",
					uri: LinkedGov.vars.lgNameSpace
				}
			}
		},

		/*
		 * Build the array of column objects and save the RDF.
		 */
		initialise : function(elmts) {

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			self.vars.colObjects = self.buildColumnObjects();

			if(self.vars.colObjects.length == 2 && self.vars.colObjects[0].type == "northing" || self.vars.colObjects[0].type == "easting"){
				self.convertNorthingEastingToLatLong(function(){
					LinkedGov.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
						self.saveRDF(rootNode, foundRootNode);
					});
				});
			} else {
				LinkedGov.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
					self.saveRDF(rootNode, foundRootNode);
				});
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
			 * Check that columns have actually been selected, loop through them and
			 * create a column object for each of them - storing their name and their 
			 * geolocation type.
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
		 * convertNorthingEastingToLatLong
		 * 
		 * Add a new column using the GREL function built by Glyn that converts
		 * an Easting,Northing to a Latitude,Longitude
		 */
		convertNorthingEastingToLatLong:function(callback){
			
			var self = this;
			var northingCol = "";
			var eastingCol = "";
			
			for(var i=0;i<self.vars.colObjects.length; i++){
			
				if(self.vars.colObjects[i].type == "northing") {
					northingCol = self.vars.colObjects[i].name;
					eastingCol = self.vars.colObjects[i?0:1].name;
				} else if (self.vars.colObjects[i].type == "easting"){
					eastingCol = self.vars.colObjects[i].name;
					northingCol = self.vars.colObjects[i?0:1].name;					
				}
				
			}
			
			Refine.postCoreProcess("add-column", {
				baseColumnName : eastingCol,
				expression : "northingEastingToLatLong(cells[\""+eastingCol+"\"].value,cells[\""+northingCol+"\"].value)",
				newColumnName : "Latitude,Longitude",
				columnInsertIndex : Refine.columnNameToColumnIndex(eastingCol) + 1,
				onError : "keep-original"
			}, null, {
				modelsChanged : true
			}, {
				onDone : function() {
					/*
					 * Create the column object for the new column
					 */
					self.vars.colObjects.push({
						type : "lat-long",
						name : "Latitude,Longitude"
					});

					callback();
				}
			});
			
		},

		
		/*
		 * saveRDF
		 * 
		 * Loop through the column objects, check if they have any existing entries
		 * and store their RDF accordingly.
		 * 
		 */
		saveRDF : function(rootNode, newRootNode) {

			//log("saveRDF");

			var self = this;

			var obj = {
					"uri" : self.vars.vocabs.lg.uri+"location",
					"curie" : self.vars.vocabs.lg.curie+":location",
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
			

			var colObjects = self.vars.colObjects;

			/*
			 * Loop through the column objects and check for any existing RDF by
			 * searching for the column name.
			 * 
			 * If there is existing lat-long RDF for a column, it's removed.
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

				/*
				 * Create 
				 */
				var uri, curie = "";

				switch (colObjects[i].type) {
				case "long":
					/*
					 * Create the longitude RDF
					 */
					uri = vocabs.geo.uri + colObjects[i].type;
					curie = vocabs.geo.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					break;
				case "lat":
					/*
					 * Create the latitude RDF
					 */
					uri = vocabs.geo.uri + colObjects[i].type;
					curie = vocabs.geo.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					break;
				case "northing":
					/*
					 * Create the northing RDF
					 */
					uri = vocabs.spatialrelations.uri + colObjects[i].type;
					curie = vocabs.spatialrelations.curie + ":"
					+ colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					break;
				case "easting":
					/*
					 * Create the easting RDF
					 */
					uri = vocabs.spatialrelations.uri + colObjects[i].type;
					curie = vocabs.spatialrelations.curie + ":"
					+ colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					break;
				case "lat-long":
					/*
					 * Create lat-long RDF
					 */
					uri = vocabs.geo.uri + "lat";
					curie = vocabs.geo.curie + ":" + "lat";
					obj.target.links.push(self.makeLatLongRDFCombined("lat",colObjects[i].name, uri, curie));
					uri = vocabs.geo.uri + "long";
					curie = vocabs.geo.curie + ":" + "long";
					obj.target.links.push(self.makeLatLongRDFCombined("long",colObjects[i].name, uri, curie));
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
		 * Constructs the RDF object, also types the value as a float.
		 */
		makeLatLongRDF : function(colName, uri, curie) {

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
		
		makeLatLongRDFCombined: function(type, colName, uri, curie) {
			
			var segmentSplit = 0;
			
			if(type == "lat"){
				segmentSplit = 0;
			} else {
				segmentSplit = 1;
			}
			
			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#float",
						"expression" : "value.split(\",\")["+segmentSplit+"]",
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
