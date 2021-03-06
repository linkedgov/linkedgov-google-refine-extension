/*
 * geolocationWizard
 * 
 * The user can specify if one or more columns contain a latitude, 
 * longitude, northing or easting.
 * 
 * After selecting the column(s), a select box is provided containing 
 * the geolocation types.
 * 
 */
var LinkedGov_geolocationWizard = {

		vars : {
			elmts : {},
			coordinateName:"",
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
					uri: LG.vars.projectURI
				}
			},
			unexpectedValueRegex : 'grel:if(isBlank(value),"float",if(type(value) == "number",(if(value % 1 == 0,"int","float")),if(((type(value.match(/\\b\\d{4}[\\-]\\d{1,2}[\\-]\\d{1,2}\\b/))=="array")),"error","error"))))'
		},

		/*
		 * Build the array of column objects and save the RDF.
		 */
		initialise : function(elmts) {

			var self = this;

			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}


			self.vars.elmts = elmts;
			self.vars.colObjects = self.buildColumnObjects();

			if(self.vars.colObjects.length > 0){
				/*
				 * Ask the user to enter a name for the location (as a form 
				 * of identification if there is more than one location per row).
				 */
				self.vars.coordinateName = "";
				//while(self.vars.coordinateName.length < 3){

				LG.prompt({
					text:"Enter a name for these coordniates, e.g. \"Building coordinates\"",
					value:"",
					ok:function(value){
						if(typeof value == 'undefined' || value.length < 3){
							LG.alert("The name must be at least 3 characters long.");
						} else {
							DialogSystem.dismissAll();
							self.vars.coordinateName = value;

							LG.showWizardProgress(true);

							// Convert the lat/long columns to numbers before operating on them
							self.convertColumnsToNumber(0,function(){

								// We can check the columns contain floats or ints depending on 
								// what the user has specified.
								var colObjects = self.prepareColumnObjectsForValueTest();
								LG.panels.wizardsPanel.checkForUnexpectedValues(colObjects, self.vars.elmts.geolocationBody, function(){
									LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
										self.saveRDF(rootNode, foundRootNode);
									});
								});
							});
						}
					},
					cancel: function(){
						DialogSystem.dismissAll();
					}
				});


				//}

			} else {
				self.onFail("One or more columns need to be selected in order to proceed with the wizard.");				
			}
		},

		/*
		 * buildColumnObjects
		 * 
		 * Creates an array of fragment/column name objects.
		 */
		buildColumnObjects : function() {

			var self = this;
			var array = [];

			/*
			 * Check that columns have actually been selected, loop through them and
			 * create a column object for each of them - storing their name and their 
			 * geolocation type.
			 */
			if ($(self.vars.elmts.geolocationColumns).children("li").length > 0) {
				$(self.vars.elmts.geolocationColumns).children("li").each(function() {

					// Single parts
					var el = $(this);
					/*
					 * Skip any columns that have been removed
					 */
					if (!$(this).hasClass("skip")) {
						array.push({
							name : el.data("colName"),
							type : el.find("select").val()
						});
					}

				});

				return array;
			} else {
				return array;
			}
		},

		/*
		 * convertColumnsToNumber
		 * 
		 * Makes sure that the values in the columns selected are parsed 
		 * as numbers before operating on them.
		 */
		convertColumnsToNumber: function(index, callback){

			var self = this;

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "text-transform",
				data : {
					columnName : self.vars.colObjects[index].name,
					expression : 'value.toNumber()',
					onError : 'keep-original',
					repeat : false,
					repeatCount : ""
				},
				success : function() {

					if(index == self.vars.colObjects.length-1){
						if(callback){
							Refine.update({cellsChanged : true},callback);
						} else {
							Refine.update({cellsChanged : true});
						}
					} else {
						index = index+1;
						self.convertColumnsToNumber(index++, callback);
					}
				},
				error : function() {
					self.onFail("There was a problem when converting the \""+self.vars.colObjects[i].name+"\" column to numbers.");
				}
			});	


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
		},


		/*
		 * saveRDF
		 * 
		 * Loop through the column objects, check if they have any existing entries
		 * and store their RDF accordingly.
		 * 
		 */
		saveRDF : function(rootNode, newRootNode) {

			var self = this;

			var obj = {
					"uri" : self.vars.vocabs.lg.uri+LG.urlifyColumnName(self.vars.coordinateName),
					"curie" : self.vars.vocabs.lg.curie+":"+LG.urlifyColumnName(self.vars.coordinateName),
					"target" : {
						"nodeType" : "cell-as-resource",
						"expression" : "value+\"#"+LG.urlifyColumnName(self.vars.coordinateName)+"\"",
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
			 * If the user specified northing and easting values, then we need to use 
			 * our northingEastingToLatLong function to convert the values.
			 * 
			 * Here we set a boolean, indicating there are N/E values present and store 
			 * their column names for use below.
			 */	
			var northingOrEastingPresent = false;
			var northingCol = "";
			var eastingCol = "";

			if(colObjects.length == 2 && colObjects[0].type == "northing" || colObjects[0].type == "easting"){

				northingOrEastingPresent = true;

				for(var i=0;i<colObjects.length; i++){
					if(colObjects[i].type == "northing") {
						northingCol = colObjects[i].name;
						eastingCol = colObjects[i?0:1].name;
					} else if (colObjects[i].type == "easting"){
						eastingCol = colObjects[i].name;
						northingCol = colObjects[i?0:1].name;					
					}
				}
			}


			/*
			 * Loop through the column objects and check for any existing RDF by
			 * searching for the column name.
			 * 
			 * If there is existing lat-long RDF for a column, it's removed.
			 */
			for ( var i = 0; i < colObjects.length; i++) {

				var links = rootNode.links;

				for ( var j = 0; j < links.length; j++) {
					if (typeof links[j].target != 'undefined' && links[j].target.columnName == colObjects[i].name) {
						/*
						 * Found existing RDF for the column, so remove it.
						 */
						//log("Found geolocation RDF data for column: \"" + colObjects[i].name + "\", removing ...");
						links.splice(j, 1);
						j--;
					}
				}

				var vocabs = self.vars.vocabs;

				/*
				 * Create the latitude and longitude RDF.
				 * 
				 */

				var uri, curie = "";

				switch (colObjects[i].type) {
				case "latlong":					
					obj.target.links = self.makeCombinedLatLongRDF(colObjects[i].name);
					break;
				case "eastingnorthing":
					obj.target.links = self.makeCombinedEastingNorthingRDF(colObjects[i].name);
					break;
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
					curie = vocabs.spatialrelations.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					uri = vocabs.geo.uri + "lat";
					curie = vocabs.geo.curie + ":" + "lat";
					obj.target.links.push(self.makeConvertedLatLongRDF(northingCol, eastingCol, "latitude", uri, curie));

					break;
				case "easting":
					/*
					 * Create the easting RDF
					 */
					uri = vocabs.spatialrelations.uri + colObjects[i].type;
					curie = vocabs.spatialrelations.curie + ":" + colObjects[i].type;
					obj.target.links.push(self.makeLatLongRDF(colObjects[i].name, uri, curie));

					uri = vocabs.geo.uri + "long";
					curie = vocabs.geo.curie + ":" + "long";
					obj.target.links.push(self.makeConvertedLatLongRDF(northingCol, eastingCol, "longitude", uri, curie));

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

		makeCombinedLatLongRDF : function(colName){

			var self = this;

			var lat = {
					"uri" : self.vars.vocabs.geo.uri + "lat",
					"curie" : self.vars.vocabs.geo.curie + ":" + "lat",
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#float",
						"expression" : "escape(value.match(/^(\\-?\\d+(\\.\\d+)?),\\s*(\\-?\\d+(\\.\\d+)?)/)[0],'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			var long = {
					"uri" : self.vars.vocabs.geo.uri + "long",
					"curie" : self.vars.vocabs.geo.curie + ":" + "long",
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#float",
						"expression" : "escape(value.match(/^(\\-?\\d+(\\.\\d+)?),\\s*(\\-?\\d+(\\.\\d+)?)/)[2],'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			var latlong = [];
			latlong.push(lat);
			latlong.push(long);

			return latlong;

		},

		makeCombinedEastingNorthingRDF : function(colName){

			var self = this;

			var easting = {
					"uri" : self.vars.vocabs.spatialrelations.uri + "easting",
					"curie" : self.vars.vocabs.spatialrelations.curie + ":" + "easting",
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#int",
						"expression" : "escape(value.match(/^(\\-?\\d+(\\.\\d+)?),\\s*(\\-?\\d+(\\.\\d+)?)/)[0],'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			var northing = {
					"uri" : self.vars.vocabs.spatialrelations.uri + "northing",
					"curie" : self.vars.vocabs.spatialrelations.curie + ":" + "northing",
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#int",
						"expression" : "escape(value.match(/^(\\-?\\d+(\\.\\d+)?),\\s*(\\-?\\d+(\\.\\d+)?)/)[2],'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			var eastingnorthing = [];
			eastingnorthing.push(easting);
			eastingnorthing.push(northing);

			return eastingnorthing;
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
						"valueType" : (uri.indexOf("spatialrelations") > 0 ? "http://www.w3.org/2001/XMLSchema#int" : "http://www.w3.org/2001/XMLSchema#float"),
						"expression" : "escape(value,'xml')",
						"columnName" : colName,
						"isRowNumberCell" : false
					}
			};

			return o;
		},

		/*
		 * makeConvertedLatLongRDF
		 * 
		 * Creates a latitude or longitude RDF triple using a pair of northing & easting values.
		 */
		makeConvertedLatLongRDF:function(northingCol, eastingCol, latOrLong, uri, curie){

			var o = {
					"uri" : uri,
					"curie" : curie,
					"target" : {
						"nodeType" : "cell-as-literal",
						"valueType" : "http://www.w3.org/2001/XMLSchema#float",
						"expression" : "northingEastingToLatLong(cells[\""+eastingCol+"\"].value,cells[\""+northingCol+"\"].value).split(',')["+(latOrLong == "latitude" ? 0 : 1)+"]",
						"columnName" : northingCol,
						"isRowNumberCell" : false
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
			LG.alert("Geolocation wizard failed. " + message);
			self.vars.coordinateName = "";
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.geolocationBody);
			LG.showWizardProgress(false);
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete : function() {

			var self = this;

			Refine.update({everythingChanged : true}, function() {

				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.geolocationBody);
				LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.geolocationBody);
				// Add typed class to column headers
				LG.showWizardProgress(false);

				self.vars.coordinateName = "";

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
		 * - unexpectedValueRegex
		 * - expectedType
		 * - exampleValue
		 */
		prepareColumnObjectsForValueTest:function(){

			var self = this;

			var colObjects = self.vars.colObjects;

			for(var i=0; i<colObjects.length; i++){

				colObjects[i].unexpectedValueParams = {
						expression:self.vars.unexpectedValueRegex,
						colName:colObjects[i].name
				};

				if(colObjects[i].type == "lat"){
					colObjects[i].unexpectedValueParams.expectedType = "float";
					colObjects[i].unexpectedValueParams.exampleValue = "51.0032";					
				} else if(colObjects[i].type == "long"){
					colObjects[i].unexpectedValueParams.expectedType = "float";
					colObjects[i].unexpectedValueParams.exampleValue = "-0.2862";					
				} else if(colObjects[i].type == "northing" || colObjects[i].type == "easting"){
					colObjects[i].unexpectedValueParams.expectedType = "int";
					colObjects[i].unexpectedValueParams.exampleValue = "499082";
				} else {
					delete colObjects[i].unexpectedValueParams;
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

			/*
			 * Display the "working..." sign
			 */
			//LG.showWizardProgress(true);

			/*
			 * Convert the lat/long columns to numbers before operating on them
			 */
			self.convertColumnsToNumber(0);


		}
};
