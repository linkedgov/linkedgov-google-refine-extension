/*
 * LinkedGov extension for Google Refine
 * Author: Dan Smith
 * 
 * rdfOperations.js
 * 
 * Functions and operations that allow the wizards to save RDF to 
 * the RDF schema.
 * 
 * Accessed as LG.rdfOps.fn
 * 
 */

var LinkedGov_rdfOperations = {

		/*
		 * saveBaseURI
		 * 
		 * Saves the base URI for the project - to be used 
		 * when saving the RDF schema.
		 */
		saveBaseUri:function(newBaseUri){

			log("saveBaseUri");

			$.post("/command/rdf-extension/save-baseURI?" + $.param({
				project: theProject.id,
				baseURI: newBaseUri
			}),function(data){
				if (data.code === "error"){
					alert('Error saving base URI:' + data.message);
				}
			},"json");

		},

		/*
		 * getRDFSchema
		 * 
		 * Returns the RDF plugin schema (if there is one), otherwise returns our
		 * skeleton of the schema to begin the first RDF operations on.
		 */
		getRDFSchema : function() {

			// log("getRDFSchema");

			if (typeof theProject.overlayModels != 'undefined'
				&& typeof theProject.overlayModels.rdfSchema != 'undefined') {
				LG.vars.rdfSchema = theProject.overlayModels.rdfSchema;
				return theProject.overlayModels.rdfSchema;
			} else {
				return LG.vars.rdfSchema;
			}

		},

		/*
		 * checkPrefixes
		 * 
		 * Checks that the vocabularies present in the vocab configuration object that each
		 * wizard owns are present in the RDF schema.
		 * 
		 * If not, then add them.
		 */
		checkPrefixes : function(vocabs){

			// log("checkPrefixes");

			var self = this;
			var schema = self.getRDFSchema();

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

		},

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
		checkSchema : function(vocabs, callback) {

			//log("checkSchema");

			var self = this;
			var schema = self.getRDFSchema();
			var namespaces = [];

			/*
			 * Loop through the wizard's vocabularies and make 
			 * sure they all exist in the RDF schema.
			 */
			self.checkPrefixes(vocabs);

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
						//log("found the root node");
						if(callback){
							callback(schema.rootNodes[i], false);
						}

						i = schema.rootNodes.length;

					} else if (i == schema.rootNodes.length - 1) {
						//log("created a new root node");
						rootNode = {
								"nodeType" : "cell-as-resource",
								"expression" : "value",
								"isRowNumberCell" : true,
								"rdfTypes" : [],
								"links" : []
						};
						if(callback){
							callback(rootNode, true);
						}

						i = schema.rootNodes.length;
					}
				}

			} else {
				//log("created a new root node 2");
				rootNode = {
						"nodeType" : "cell-as-resource",
						"expression" : "value",
						"isRowNumberCell" : true,
						"rdfTypes" : [],
						"links" : []
				};
				if(callback){
					callback(rootNode, true);
				}
			}
		},

		/*
		 * saveMetadataToRDF
		 * 
		 * Saves the projects metadata in RDF.
		 * 
		 */
		saveMetadataToRDF : function(callback){

			var self = this;

			// Store the projects RDF schema
			var schema = self.getRDFSchema();

			// Attempt to locate an existing metadata root node 
			// and remove it before saving the metadata.
			for(var i=0; i<schema.rootNodes.length; i++){
				for(var j=0; j<schema.rootNodes[i].links.length; j++){
					if(schema.rootNodes[i].links[j].curie == "dct:title"){
						// Splice the root node from the rootNodes array
						schema.rootNodes.splice(i,1);
					}
				}
			}

			// Destroy any hidden column data
			// TODO: Why do we do this?
			//LG.ops.eraseHiddenColumnData();

			// Create a vocabulary config object storing the vocabulary details
			// we need to use in order to save the metadata
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

			// Locate and remove any of these vocabularies before adding them
			// to the prefixes array.
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

			// Grab the project's metadata and use the object returned in 
			// the callback to create RDF fragments
			self.getDatasetMetadata(function(metadataObject){

				// Begin to construct the root node
				var rootNode = {
						links : [],
						nodeType : "resource",
						rdfTypes : [{
							"uri":"http://rdfs.org/ns/void#Dataset",
							"curie":"void:Dataset"
						}],
						value : LG.vars.lgNameSpace + "dataset/" + theProject.id
				};

				// Loop through the metadata key-values in the metadataObject
				// that was passed to this callback function by the getDatasetMetadata()
				// function
				$.each(metadataObject,function(key,val){

					// log(key+" : "+val);

					// Depending on the metadata key, save a particular type of 
					// RDF fragment using the correct vocabulary and property.
					switch(key){
					case "LG.name" :
						rootNode.links.push({
							curie : "dct:title",
							target : {
								lang : "en",
								nodeType : "literal",
								value : val
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
								value : "mailto:fixme@org"
							},
							uri : "http://purl.org/openorg/corrections"
						});

						break;
					case "LG.source" :
						rootNode.links.push({
							uri:"http://purl.org/dc/terms/source",
							curie:"dct:source",
							target:{
								nodeType:"resource",
								value:val,
								rdfTypes:[],
								links:[]
							}
						});
						break;
					case "LG.license" :
						rootNode.links.push({
							curie : "dct:license",
							target:{
								nodeType:"resource",
								value:val,
								rdfTypes:[],
								links:[]
							},
							uri : "http://purl.org/dc/terms/license"
						});
						break;
					case "LG.licenseLocation" :
						if(val != 'null' && val != null && val.length > 4){
							rootNode.links.push({
								curie : "cc:attributionURL",
								target:{
									nodeType:"resource",
									value:val,
									rdfTypes:[],
									links:[]
								},
								uri : "http://creativecommons.org/ns#attributionURL"
							});
						}
						break;
					case "LG.organisation" :				

						var targetVar = {
							lang : "en",
							nodeType : "literal",
							value : val
					};

						// URLs need to be stored differently (as resources)
						if(val.indexOf("http") > 0){
							targetVar = {
									nodeType:"resource",
									value:val,
									rdfTypes:[],
									links:[]
							};
						}

						rootNode.links.push({
							curie : "dct:publisher",
							target : targetVar,
							uri : "http://purl.org/dc/terms/publisher"
						});

						break;
					case "LG.datePublished" :
						rootNode.links.push({
							curie : "dct:created",
							target : {
								nodeType : "literal",
								value : val,
								valueType : "http://www.w3.org/2001/XMLSchema#date"
							},
							uri : "http://purl.org/dc/terms/created"
						});
						break;
					case "LG.webLocation" :
						rootNode.links.push({
							curie : "foaf:page",
							target:{
								nodeType:"resource",
								value:val,
								rdfTypes:[],
								links:[]
							},
							uri : "http://xmlns.com/foaf/0.1/page"
						});
						break;
					case "LG.descriptionLocation" :
						break;

					case "LG.frequency" :
						rootNode.links.push({
							curie : "dct:accrualPeriodicity",
							target : {
								lang : "en",
								nodeType : "literal",
								value : val
							},
							uri : "http://purl.org/dc/terms/accrualPeriodicity"
						});
						break;
					case "LG.keywords" :
						// The holygot vocabulary requires the tags to be stored using an 
						// intermediary blank node (e.g. <dataset> <taggedWithTag> <blank_node> <tag> "mySuperTag")
						// TODO: Seems backward to me, this makes more sense: <dataset> <taggedWithTag> "mySuperTag"[<type=tag>]
						var keywords = val.split(",");
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

				// Get the RDF schema
				var schema = self.getRDFSchema();
				// Insert the metadata node into the front of the root node array, 
				// so it prints out at the top when exporting as RDF/TTL.
				schema.rootNodes.splice(0,0,rootNode);

				/*
				 * Save the RDF.
				 */
				Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
					schema : JSON.stringify(schema)
				}, {}, {
					onDone : function() {
						if(callback){
							callback();
						}
					}
				});

			});



		},

		/*
		 * getDatasetMetadata
		 * 
		 * Iterates through an object of metadata keys and requests 
		 * their values using the get-preference command.
		 * 
		 * Passes the populated object to the callback, which is to 
		 * then save the metadata as RDF.
		 */
		getDatasetMetadata : function(callback){

			// Create the object to store the metadata in
			var metadataObject = {
					"LG.name":"",
					"LG.license":"",
					"LG.licenseLocation":"",
					"LG.frequency":"",
					"LG.organisation":"",
					"LG.datePublished":"",
					"LG.source":"",
					"LG.webLocation":"",
					"LG.descriptionLocation":"",
					"LG.keywords":""
			};

			var length = 0;
			var iterator = 0;

			// Count how many keys we have
			$.each(metadataObject,function(key,val){length++;});

			// For each key, request it's value using "get-preference"
			$.each(metadataObject,function(key,val){
				$.ajax({
					type: "GET",
					url: "/command/core/get-preference?" + $.param({ 
						name: key,
						project : theProject.id
					}),
					success:function(data){

						// Decode any encoded URLs in the metadata
						metadataObject[key] = decodeURIComponent(data.value);

						// If we've requested all the keys
						if(iterator == length-1){
							callback(metadataObject);
						}

						iterator++;
					},
					dataType: "json"
				});
			});

		},

		/*
		 * removeColumnInRDF
		 * 
		 * Removes a column's RDF from the schema.
		 * 
		 * Lots of looping instead of recursion as it's finite.
		 * 
		 * TODO: Change approach?
		 */
		removeColumnInRDF : function(colName,callback) {

			//log("removeColumnInRDF");
			var self = this;
			var schema = self.getRDFSchema();
			var rootNodes = schema.rootNodes;

			//Loop through root nodes
			for(var i=0;i<rootNodes.length; i++){
				//if "nodeType" == "cell-as-resource" then we've found the ROW root node
				if(typeof rootNodes[i].nodeType != 'undefined' && rootNodes[i].nodeType == "cell-as-resource"){
					// for each of the links for the ROW root node
					for(var j=0;j<rootNodes[i].links.length;j++){
						// non-blank and blank nodes all exist in the first "target" 
						// object of a link
						if(typeof rootNodes[i].links[j].target != 'undefined') {
							//check for the column name in non-blank-node links
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
								/*
								 * Else traverse a level deeper into the node and scan for the 
								 * column name across the node's links (this is usually for 
								 * blank node links that require another hop - in terms of graph hopping).
								 */
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
						// Using recursion would solve this
					}
				}
			}
		},


		/*
		 * removeColumnReconciliationRDF
		 * 
		 * Removes a columns reconciliation RDF data - which can 
		 * be located using the "lgrecon:" property prefix.
		 * 
		 * The RDF data exists as a "link" to a "rootNode" with a curie that 
		 * begins "lgrecon".
		 */
		removeColumnReconciliationRDF: function(columnName, callback) {

				log("removeColumnReconciliationRDF");

				var self = this;
				
				/*
				 * Make sure the schema exists before attempting to rename 
				 * the column names it contains.
				 */
				if (typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined') {

					var schema = self.getRDFSchema();
					var rootNode = {};
					
					// Locate the row root node - distinguishable by it's property
					// "isRowNumberCell"
					for(var i=0; i<schema.rootNodes.length; i++){
						if(typeof schema.rootNodes[i].isRowNumberCell != 'undefined' && schema.rootNodes[i].isRowNumberCell){
							for(var j=0; j<schema.rootNodes[i].links.length; j++){
								if(schema.rootNodes[i].links[j].curie.indexOf("lgrecon") >= 0 
										&& schema.rootNodes[i].links[j].target.columnName == columnName){
									schema.rootNodes[i].links.splice(j,1);
									log("Removed reconciliation data for "+columnName);
									j = schema.rootNodes[i].links.length-1;
								}
							}
							i = schema.rootNodes.length-1;
						}
					}
					
					/*
					 * Save the RDF.
					 */
					Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
						schema : JSON.stringify(schema)
					}, {}, {
						onDone : function() {
							//log("RDF Schema saved");
							if(callback){
								callback();
							}
						}
					});
				} else {
					if(callback){
						callback();
					}
					return false;
				}

		},

		/*
		 * renameColumnInRDF
		 * 
		 * Called whenever a column-rename operation occurs. If a column is renamed in 
		 * Refine *after* RDF has been produced for it, it's old name remains in the RDF.
		 * This function traverses the RDF schema and finds the column name that has 
		 * been changed and changes it to it's new name.
		 */
		renameColumnInRDF : {

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
			 * 
			 * It's possible for column names to exist as the object of a triple 
			 * (e.g. x - y - column name), or within a GREL expression string, so 
			 * we need to check for both.
			 */
			recursiveFunction : function(key, val) {
				var self = this;

				if (val instanceof Object) {

					if (typeof val.columnName != 'undefined') {			
						if (val.columnName == self.vars.oldName) {
							val.columnName = self.vars.newName;
						}
					}

					if(typeof val.expression != 'undefined'){
						if(val.expression.indexOf(self.vars.oldName) > 0){
							val.expression = val.expression.replace(self.vars.oldName, self.vars.newName);
						}
					}

					$.each(val, function(key, value) {
						self.recursiveFunction(key, value)
					});
				}
			}

		},

		/*
		 * saveLabelsToRDF
		 * 
		 * Saves the labels and descriptions given to the rows and columns
		 * on the labelling panel.
		 */
		saveLabelsToRDF: {

			vars : {
				vocabs : {
					lg : {
						curie : "lg",
						uri : "http://data.linkedgov.org/vocab/"
					},
					rdfs: {
						curie: "rdfs",
						uri: "http://www.w3.org/2000/01/rdf-schema#"
					},
					owl :{
						curie: "owl",
						uri: "http://www.w3.org/2002/07/owl#"					
					}
				}
			},

			/*
			 * Check which column headers don't have the "typed" class.
			 */
			init : function() {

				var self = this;

				self.vars.cols = LG.vars.labelsAndDescriptions.cols;
				self.vars.rowLabel = LG.vars.labelsAndDescriptions.rowLabel;
				self.vars.rowDescription = LG.vars.labelsAndDescriptions.rowDescription;

				LG.rdfOps.checkPrefixes(self.vars.vocabs);

				/*
				 * Chain together a series of save operations using callbacks.
				 * 
				 * Save the project's metadata
				 * 
				 * TODO: Don't chain the metadata save with the labelling panel save.
				 * These should be separate.
				 */
				LG.rdfOps.saveMetadataToRDF(function(){
					/*
					 * saveRowClass - save the owl:Class description for the row.
					 */
					self.saveRowAsClass(function() {
						/*
						 * saveColumnsAsProperties - save the owl:ObjectProperty descriptions for the columns
						 */
						self.saveColumnsAsProperties(function() {
							/*
							 * TODO: Do not chain the finaliseRDFSchema save 
							 * to the labelling panel save. Should be separate.
							 */
							LG.rdfOps.finaliseRDFSchema.init();

						});
					});
				});

			},


			/*
			 * saveRowAsClass
			 * 
			 * Creates the owl:Class description for the rows.
			 */
			saveRowAsClass : function(callback) {

				//log("saveRowClass");

				var self = this;

				var schema = LG.rdfOps.getRDFSchema();

				/*
				 * Locate and remove any existing owl:Class root nodes
				 */
				for(var i=0; i<schema.rootNodes.length; i++){
					for(var j=0; j<schema.rootNodes[i].rdfTypes.length; j++){
						if(schema.rootNodes[i].rdfTypes[j].curie == self.vars.vocabs.owl.curie+":Class"){
							schema.rootNodes.splice(i,1);
							i--;
						}
					}
				}

				var camelizedRowLabel = LG.camelize(LG.vars.labelsAndDescriptions.rowLabel);

				/*
				 * Exists in the schema as it's own root node, so we create one here 
				 * with a label and a comment.
				 */
				var rootNode = {
						links : [ {
							curie : self.vars.vocabs.rdfs.curie+":label",
							target : {
								lang : "en",
								nodeType : "literal",
								value : camelizedRowLabel
							},
							uri : self.vars.vocabs.rdfs.uri+"label"
						}],
						nodeType : "resource",
						rdfTypes : [ {
							curie : "owl:Class",
							uri : self.vars.vocabs.owl.uri+"Class"
						} ],
						value : LG.vars.lgNameSpace + "terms/class/" + camelizedRowLabel
				};

				/*
				 * Add the row description separately in case the user hasn't entered a 
				 * description for it.
				 */
				if (LG.vars.labelsAndDescriptions.rowDescription.length > 2 && LG.vars.labelsAndDescriptions.rowDescription != "Enter a description...") {
					rootNode.links.push({
						curie : self.vars.vocabs.rdfs.curie+":comment",
						target : {
							lang : "en",
							nodeType : "literal",
							value : LG.vars.labelsAndDescriptions.rowDescription
						},
						uri : self.vars.vocabs.rdfs.uri+"comment"
					});
				}


				/*
				 * Add the root node to the schema just after the metadata node 
				 * (which is the first node)
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

				//log("saveColumnsAsProperties");

				var self = this;
				var cols = LG.vars.labelsAndDescriptions.cols;
				var schema = LG.rdfOps.getRDFSchema();

				/*
				 * Locate and remove any existing owl:ObjectProperty root nodes
				 */
				for(var i=0; i<schema.rootNodes.length; i++){
					for(var j=0; j<schema.rootNodes[i].rdfTypes.length; j++){
						if(schema.rootNodes[i].rdfTypes[j].curie == self.vars.vocabs.owl.curie+":ObjectProperty"){
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

					//log("camelize(cols[i].label): "+LG.camelize(cols[i].label));

					var rootNode = {
							nodeType : "resource",
							rdfTypes : [ {
								curie : self.vars.vocabs.owl.curie+":ObjectProperty",
								uri : self.vars.vocabs.owl.uri+"ObjectProperty"
							} ],
							value : LG.vars.lgNameSpace + "terms/property/" + LG.camelize(cols[i].label),
							links : [ {
								curie : self.vars.vocabs.rdfs.curie+":label",
								target : {
									lang : "en",
									nodeType : "literal",
									value : cols[i].label
								},
								uri : self.vars.vocabs.rdfs.uri+"label"
							} ]
					}

					/*
					 * Add the column description separately in case the user hasn't entered a 
					 * description for it.
					 */
					if (cols[i].description.length > 2 && cols[i].description != "Enter a description...") {
						rootNode.links.push({
							curie : self.vars.vocabs.rdfs.curie+":comment",
							target : {
								lang : "en",
								nodeType : "literal",
								value : cols[i].description
							},
							uri : self.vars.vocabs.rdfs.uri+"comment"
						})
					}

					/*
					 * Add the root node to the schema.
					 * 
					 * i+2 to skip inserting the rootnode before the metadata node or the 
					 * owl:Class node.
					 * 
					 */
					schema.rootNodes.splice(i+2,0,rootNode);

					if (i == cols.length - 1) {
						if(callback){
							callback();
						}
					}
				}

			}
		},

		/*
		 * finaliseRDFSchema
		 * 
		 * Called once the "Labels and Descriptions" panel is completed.
		 * 
		 * For any columns that do not have RDF stored, this function saves 
		 * their values in RDF using the column name as the property name.
		 */
		finaliseRDFSchema : {

			vars:{
				vocabs:{
					lg:{
						uri:LG.vars.lgNameSpace,
						curie:"lg"
					}
				}
			},

			init: function(){

				var self = this;

				//log("finaliseRDFSchema.init()");

				/*
				 * Check for/create a root node for column RDF in the schema.
				 */
				LG.rdfOps.checkSchema(self.vars.vocabs, function(rootNode, foundRootNode) {

					var camelizedRowLabel = LG.camelize(LG.vars.labelsAndDescriptions.rowLabel);

					/*
					 * Camelize the row label that's been entered and type the root node (each row) 
					 * as the label. E.g. "Each row is a lg:utilityReading".
					 */
					rootNode.rdfTypes = [ {
						uri : self.vars.vocabs.lg.uri + camelizedRowLabel,
						curie : self.vars.vocabs.lg.curie + ":" + camelizedRowLabel
					} ];

					/*
					 * Save the RDF for the columns that were not involved in any wizard
					 * operations.
					 */
					self.saveGenericColumnRDF(rootNode, foundRootNode, function(){
						// TODO: What to do when finished.
						LG.showFinishMessage();
					});

				});

			},

			/*
			 * saveGenericColumnRDF
			 * 
			 * Creates the generic RDF for each column that wasn't involved in 
			 * any of the wizards using the column name as the property for the rows.
			 */
			saveGenericColumnRDF : function(rootNode, newRootNode, callback) {

				var self = this;
				LG.showWizardProgress(true);

				/*
				 * Loop through the column header elements of the data table and check for any 
				 * headers that haven't been given the RDF "typed" class (that indicates RDF exists for them).
				 * 
				 * If the column doesn't have an indicator, then produce generic RDF for it and add it to the existing root
				 * node for the wizard column RDF.
				 */

				$("td.column-header").each(function() {
					if ($(this).find("span.column-header-name").html() != "All" && !$(this).hasClass("typed") && ($.inArray($(this).find("span.column-header-name").html(), LG.vars.hiddenColumns.split(",")) < 0)) {

						//log("\""+ $(this).find("span.column-header-name").html() + "\" has no RDF, generating generic RDF for it.");

						var camelizedColumnName = LG.camelize($(this).find("span.column-header-name").html());

						/*
						 * Generic triple structure is: <row> <lg:columnName> "cell value"
						 */

						//log('LG.decodeHTMLEntity($(this).find("span.column-header-name").html()):');
						//log(LG.decodeHTMLEntity($(this).find("span.column-header-name").html()));

						var o = {
								"uri" : self.vars.vocabs.lg.uri + camelizedColumnName,
								"curie" : self.vars.vocabs.lg.curie + ":" + camelizedColumnName,
								"target" : {
									"nodeType" : "cell-as-literal",
									"expression" : "value",
									"columnName" : LG.decodeHTMLEntity($(this).find("span.column-header-name").html()),
									"isRowNumberCell" : false
								}
						};

						/*
						 * Detect and specify types & language for the generic RDF about columns.
						 * 
						 * The row model isn't an exact replication of the order of the columns (and therefore cells)
						 * in the data table, so we need to iterate through the column model and select each 
						 * columns "cellIndex" instead.
						 */
						var columns = theProject.columnModel.columns;
						for(var i=0; i<columns.length; i++){
							if(columns[i].name == $(this).find("span.column-header-name").html()){

								if(theProject.rowModel.rows[0].cells[columns[i].cellIndex] != null){

									var expression = 'grel:if(type(value)=="number",if(value%1==0,"int","float"),if(not(isError(value.toNumber())),if(value.toNumber()%1==0,"int","float"),"string"))';


									/*
									 * Recursive function to compute a facet for each column to find 
									 * the most frequently occuring value type (int, float, string...)
									 */
									var type = LG.ops.findHighestFacetValue(columns[i].name,expression);

									//log("Finding type of generic column...");
									//log("columns[i].name: "+columns[i].name);
									//log("type: "+type);

									if(type == "string"){
										o.target.lang = "en";
									} else if(type == "int"){
										o.target.valueType = "http://www.w3.org/2001/XMLSchema#int";
										//parseValueTypesInColumn("int",columns[i].name);
									} else if(type == "float"){
										o.target.valueType = "http://www.w3.org/2001/XMLSchema#float";
										//parseValueTypesInColumn("float",columns[i].name);
									} else if(type == "date"){
										o.target.valueType = "http://www.w3.org/2001/XMLSchema#date";
										//parseValueTypesInColumn("date",columns[i].name);
									}

								}

								i = columns.length;
							}

						}


						rootNode.links.push(o);

					}
				});

				/*
				 * Check to see if the root node needs to be added to the schema.
				 */
				var schema = LG.rdfOps.getRDFSchema();

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
						},function(){
							LG.showWizardProgress(false);
							if(callback){
								callback();
							}
						});
					}
				});
			}
		},

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
		applyTypeIcons : {


			init : function() {

				var self = this;

				/*
				 * Overwrite the Refine update function to include our own callback.
				 */			
				var lgUpdate = Refine.update;
				Refine.update = function(options, callback) {

					//log("callback");
					//log(callback);
					var theCallback = callback;
					var theOptions = options;
					var lgCallback = function() {
						LG.ops.keepHiddenColumnsHidden();
						self.apply();

						if(theCallback){
							theCallback();
						}
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

							if (val.split(":")[1] == LG.camelize($(this).find("span.column-header-name").html().toLowerCase())) {
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

		}
}
