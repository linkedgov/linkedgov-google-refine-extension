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
					uri: LG.vars.lgNameSpace
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

			LG.showWizardProgress(true);

			self.vars.elmts = elmts;

			self.vars.colObjects = self.buildColumnObjects();

			if(self.vars.colObjects.length > 0){
				/*
				 * Ask the user to enter a name for the location (as a form 
				 * of identification if there is more than one location per row).
				 */
				while(self.vars.coordinateName.length < 3){
					self.vars.coordinateName = window.prompt("Enter a name for these coordniates, e.g. \"Building coordinates\" :","");
					if(self.vars.coordinateName.length < 3){
						alert("The name must be 3 letters or longer, try again...");
					}
				}

				/*
				 * Convert the lat/long columns to numbers before operating on them
				 */
				self.convertColumnsToNumber(0,function(){
					LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
						self.saveRDF(rootNode, foundRootNode);
					});
				});

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
				self.onFail("One or more columns need to be selected in order to proceed with the wizard.");
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

					if(index==self.vars.colObjects.length-1){
						Refine.update({cellsChanged : true},callback);
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
					"uri" : self.vars.vocabs.lg.uri+LG.camelize(self.vars.coordinateName),
					"curie" : self.vars.vocabs.lg.curie+":"+LG.camelize(self.vars.coordinateName),
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
						log("Found geolocation RDF data for column: \"" + colObjects[i].name + "\", removing ...");
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
						"valueType" : (uri.indexOf("spatialrelations") > 0 ? "http://www.w3.org/2001/XMLSchema#int" : "http://www.w3.org/2001/XMLSchema#float"),
						"expression" : "value",
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
			alert("Geolocation wizard failed.\n\n" + message);
			self.vars.coordinateName = "";
			LG.resetWizard(self.vars.elmts.geolocationBody);
			LG.showWizardProgress(false);
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete : function() {

			var self = this;

			Refine.update({everythingChanged : true}, function() {

				LG.resetWizard(self.vars.elmts.geolocationBody);
				LG.showUndoButton(self.vars.elmts.geolocationBody);
				// Add typed class to column headers
				LG.showWizardProgress(false);

				/*
				 * We can check the columns contain floats or ints depending on 
				 * what the user has specified.
				 */
				var colObjects = self.prepareColumnObjectsForValueTest();
				LG.ops.checkForUnexpectedValues(colObjects, self.vars.elmts.geolocationBody);

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

			for(var i=0;i<colObjects.length;i++){

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
			LG.showWizardProgress(true);

			/*
			 * Convert the lat/long columns to numbers before operating on them
			 */
			self.convertColumnsToNumber(0,function(){
				LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {
					self.saveRDF(rootNode, foundRootNode);
				});
			});


		}
};
