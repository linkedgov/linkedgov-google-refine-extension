/*
 * LinkedGov extension for Google Refine
 * Author: Dan Smith
 * 
 * rdf-operations.js
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
				log("found the root node");
				callback(schema.rootNodes[i], false);
				i = schema.rootNodes.length;
			} else if (i == schema.rootNodes.length - 1) {
				log("created a new root node");
				rootNode = {
						"nodeType" : "cell-as-resource",
						"expression" : "value",
						"isRowNumberCell" : true,
						"rdfTypes" : [],
						"links" : []
				};
				callback(rootNode, true);
				i = schema.rootNodes.length;
			}
		}

	} else {
		log("created a new root node 2");
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
 * Makes an AJAX call to our custom "get-meta-information" command 
 * which returns us a list of key-value pairs for the form that 
 * the user filled in at the first stage of importing.
 * 
 * Then create an RDF fragment for each piece of metadata and store 
 * it in the RDF schema.
 */
LinkedGov.saveMetadataToRDF = function(callback){

	var schema = LinkedGov.getRDFSchema();
	var metadataAlreadySaved = false;

	for(var i=0; i<schema.rootNodes.length; i++){
		for(var j=0; j<schema.rootNodes[i].links.length; j++){
			if(schema.rootNodes[i].links[j].curie == "dct:title"){
				metadataAlreadySaved = true;
			}
		}
	}

	if(!metadataAlreadySaved){

		/*
		 * Restore hidden columns when the first metadata save is made
		 */
		LinkedGov.restoreHiddenColumns();

		var vocabs = [{
			name : "dct",
			uri : "http://purl.org/dc/terms/"
		},{
			name : "tags",
			uri : "http://www.holygoat.co.uk/owl/redwood/0.1/tags/"
		},{
			name : "cc",
			uri : "http://creativecommons.org/ns#"
		},{
			name : "oo",
			uri : "http://purl.org/openorg/"
		},{
			name : "foaf",
			uri : "http://xmlns.com/foaf/0.1/"
		}];

		for(var h=0; h<vocabs.length;h++){

			for (var i = 0; i < schema.prefixes.length; i++) {
				if (schema.prefixes[i].name == vocabs[h].name) {
					// log("Found existing RDF prefixes, removing...");
					schema.prefixes.splice(i, 1);
					i--;
				}
			}

			schema.prefixes.push(vocabs[h]);
		}

		$.ajax({
			type : "GET",
			url : "/command/" + "linkedgov" + "/" + "get-meta-information?project="+theProject.id,
			data : $.param({
				keys:"LinkedGov.name," +
				"LinkedGov.license," +
				"LinkedGov.licenseLocation," +
				"LinkedGov.frequency," +
				"LinkedGov.organisation," +
				"LinkedGov.datePublished," +
				"LinkedGov.source," +
				"LinkedGov.webLocation," +
				"LinkedGov.descriptionLocation," +
				"LinkedGov.keywords"
			}),
			success : function(data) {

				var rootNode = {
						links : [],
						nodeType : "resource",
						rdfTypes : [],
						value : "http://example.linkedgov.org/example-dataset/" + theProject.id
				};

				$.each(data.customMetadata,function(key,value){

					//log(key+" : "+value);

					switch(key){
					case "LinkedGov.name" :
						rootNode.links.push({
							curie : "dct:title",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/title"
						});

						/*
						 * Manually add the oo:corrections description
						 */
						rootNode.links.push({
							curie : "oo:corrections",
							target : {
								nodeType : "literal",
								value : "mailto:fixme@linkedgov.org"
							},
							uri : "http://purl.org/openorg/corrections"
						});

						break;
					case "LinkedGov.source" :
						rootNode.links.push({
							curie : "dct:source",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/source"
						});
						break;
					case "LinkedGov.license" :
						rootNode.links.push({
							curie : "dct:license",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/license"
						});
						break;
					case "LinkedGov.licenseLocation" :
						rootNode.links.push({
							curie : "cc:attributionURL",
							target : {
								nodeType : "literal",
								value : value
							},
							uri : "http://creativecommons.org/ns#attributionURL"
						});
						break;
					case "LinkedGov.organisation" :				
						rootNode.links.push({
							curie : "dct:publisher",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/publisher"
						});
						break;
					case "LinkedGov.datePublished" :
						rootNode.links.push({
							curie : "dct:created",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/created"
						});
						break;
					case "LinkedGov.webLocation" :
						rootNode.links.push({
							curie : "foaf:page",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://xmlns.com/foaf/0.1/page"
						});
						break;
					case "LinkedGov.descriptionLocation" :
						break;

					case "LinkedGov.frequency" :
						rootNode.links.push({
							curie : "dct:accrualPeriodicity",
							target : {
								lang : "en",
								nodeType : "literal",
								value : value
							},
							uri : "http://purl.org/dc/terms/accrualPeriodicity"
						});
						break;
					case "LinkedGov.keywords" :
						var keywords = value.split(",");
						for(var i=0;i<keywords.length;i++){

							rootNode.links.push({
								"uri":"http://www.holygoat.co.uk/owl/redwood/0.1/tags/taggedWithTag",
								"curie":"tags:taggedWithTag",
								"target":{
									"nodeType":"blank",
									"rdfTypes":[],
									"links":[
									         {
									        	 "uri":"http://www.holygoat.co.uk/owl/redwood/0.1/tags/tag",
									        	 "curie":"tags:tag",
									        	 "target":{
									        		 "nodeType":"literal",
									        		 "value":keywords[i].trim()
									        	 }
									         }
									         ]
								}
							});
						}
						break;
					}
				});

				var schema = LinkedGov.getRDFSchema();
				schema.rootNodes.splice(0,0,rootNode);

				/*
				 * Save the RDF.
				 */
				Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
					schema : JSON.stringify(schema)
				}, {}, {
					onDone : function() {
						Refine.update({
							everythingChanged : true
						});
					}
				});

				callback();

			},
			error : function() {

			}
		});
	} else {
		log("Metadata has already been saved.");
	}

};

/*
 * removeColumnInRDF
 * 
 * Removes a column's RDF from the schema
 */
LinkedGov.removeColumnInRDF = function(colName,callback) {

	//log("removeColumnInRDF");

	var schema = LinkedGov.getRDFSchema();
	var rootNodes = schema.rootNodes;

	//Loop through root nodes
	for(var i=0;i<rootNodes.length; i++){
		//if "nodeType" = "cell-as-resource" then we've found the ROW root node
		if(typeof rootNodes[i].nodeType != 'undefined' && rootNodes[i].nodeType == "cell-as-resource"){
			// for each of the links for the ROW root node
			for(var j=0;j<rootNodes[i].links.length;j++){
				// non-blank and blank nodes all exist in the first "target" 
				// object of a link
				if(typeof rootNodes[i].links[j].target != 'undefined') {
					//check non-blank-node links
					if(typeof rootNodes[i].links[j].target.columnName != 'undefined' 
						&& rootNodes[i].links[j].target.columnName == colName) {
						// remove link from root node
						log("Removing column RDF for: "+rootNodes[i].links[j].target.columnName);
						rootNodes[i].links.splice(j,1);
						/*
						 * Save the RDF.
						 */
						Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
							schema : JSON.stringify(schema)
						}, {}, {
							onDone : function() {
								log("Finished");
								if(callback){
									callback();
								}
							}
						});
						return false;
					} else if(typeof rootNodes[i].links[j].target.links != "undefined") {
						for(var k=0;k<rootNodes[i].links[j].target.links.length;k++){
							if(rootNodes[i].links[j].target.links[k].target != "undefined" 
								&& typeof rootNodes[i].links[j].target.links[k].target.columnName != "undefined" 
									&& rootNodes[i].links[j].target.links[k].target.columnName == colName){
								log("Removing column RDF for: "+rootNodes[i].links[j].target.links[k].target.columnName);


								rootNodes[i].links.splice(j,1);

								/*
								 * Save the RDF.
								 */
								Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
									schema : JSON.stringify(schema)
								}, {}, {
									onDone : function() {
										log("Finished");
										if(callback){
											callback();
										}
									}
								});

								return false;
							}
						}
					}
				}
				//check blank-node links (an extra link deep)
			}

		}
	}

}

/*
 * Orders the root nodes in the RDF schema so it's 
 * easier to read.
 */
LinkedGov.orderRDFSchema = function(callback){


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
			});

		},


		/*
		 * saveRowClass
		 * 
		 * Creates the owl:Class description for the rows.
		 */
		saveRowClass : function(callback) {

			var self = this;

			var schema = LinkedGov.getRDFSchema();

			/*
			 * Locate and remove any existing owl:Class root nodes
			 */
			for(var i=0; i<schema.rootNodes.length; i++){
				for(var j=0; j<schema.rootNodes[i].rdfTypes.length; j++){
					if(schema.rootNodes[i].rdfTypes[j].curie == "owl:Class"){
						schema.rootNodes.splice(i,1);
						i--;
					}
				}
			}

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
					}],
					nodeType : "resource",
					rdfTypes : [ {
						curie : "owl:Class",
						uri : "http://www.w3.org/2002/07/owl#Class"
					} ],
					value : "http://example.linkedgov.org/example-dataset/terms/"
						+ camelizedRowLabel
			};

			/*
			 * Add the row description separately in case the user hasn't entered a 
			 * description for it.
			 */
			if (LinkedGov.vars.labelsAndDescriptions.rowDescription.length > 2 && LinkedGov.vars.labelsAndDescriptions.rowDescription != "Enter a description...") {
				rootNode.links.push({
					curie : "rdfs:comment",
					target : {
						lang : "en",
						nodeType : "literal",
						value : LinkedGov.vars.labelsAndDescriptions.rowDescription
					},
					uri : "http://www.w3.org/2000/01/rdf-schema#comment"
				});
			}


			/*
			 * Add the root node to the schema.
			 */
			schema.rootNodes.splice(1,0,rootNode);

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
			 * Locate and remove any existing owl:ObjectProperty root nodes
			 */
			for(var i=0; i<schema.rootNodes.length; i++){
				for(var j=0; j<schema.rootNodes[i].rdfTypes.length; j++){
					if(schema.rootNodes[i].rdfTypes[j].curie == "owl:ObjectProperty"){
						schema.rootNodes.splice(i,1);
						i--;
					}
				}
			}

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
						value : "http://example.linkedgov.org/example-dataset/terms/" + LinkedGov.camelize(cols[i].label).replace(/:/g,"-"),
						links : [ {
							curie : "rdfs:label",
							target : {
								lang : "en",
								nodeType : "literal",
								value : cols[i].label
							},
							uri : "http://www.w3.org/2000/01/rdf-schema#label"
						} ]
				}

				/*
				 * Add the column description separately in case the user hasn't entered a 
				 * description for it.
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
				 * 
				 * i+2 to skip inserting the rootnode before the metadata node or the 
				 * owl:Class node.
				 */
				schema.rootNodes.splice(i+2,0,rootNode);

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
							"uri" : self.vars.vocabs.lg.uri + camelizedColumnName.replace(/:/g,"-"),
							"curie" : self.vars.vocabs.lg.curie + ":" + camelizedColumnName.replace(/:/g,"-"),
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

					if(theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())] != null){
						if(typeof theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v == "number"){
							if(theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v % 1 == 0){
								o.target.valueType = "http://www.w3.org/2001/XMLSchema#int";
							} else {
								o.target.valueType = "http://www.w3.org/2001/XMLSchema#float";
							}
						} else if(typeof theProject.rowModel.rows[0].cells[Refine.columnNameToColumnIndex($(this).find("span.column-header-name").html())].v == "string"){
							o.target.lang = "en";
						}
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
					LinkedGov.keepHiddenColumnsHidden();
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
					if($(this).find("span.column-header-name").length > 0){
						if ($(this).find("span.column-header-name").html().toLowerCase() == val.toLowerCase()) {
							$(this).addClass("typed");
						}
					}
				});
			} else if(key == "curie" && val != "vcard:Address"){

				$("td.column-header").each(function() {		
					if($(this).find("span.column-header-name").length > 0){

						if (val.split(":")[1] == LinkedGov.camelize($(this).find("span.column-header-name").html().toLowerCase())) {
							$(this).addClass("typed");
						}
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
