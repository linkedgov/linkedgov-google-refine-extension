/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The global LinkedGov object for the Project page.
 * 
 * Contents:
 * - Global variables (debug on / off)
 * - Initialisation functions
 * - Initial injection functions
 * - General data operations (set blank cells to null)
 * - Individual wizard operations
 * 
 * Wizards names:
 * 
 * - multipleColumnsWizard
 * - multipleValuesWizard
 * - dateTimeWizard
 * - measurementsWizard
 * - addressWizard
 * - latLongWizard
 * 
 * Notes:
 * 
 * When posting one of Refine's core process operations using 
 * Refine.postCoreProcess() - a number of UI updates is usually 
 * bundled with it as the expected behaviour is for Refine to 
 * perform a core process with gaps for user input in between. This 
 * isn't the case for the LinkedGov skin as a series of operations are 
 * often strung together and executed rapidly, resulting in flashes of
 * "updating" and "working" messages while operations are performed. To 
 * avoid this, the function call is skipped when possible and replaced 
 * using a more silent AJAX call with LinkedGov.silentProcessCall function, 
 * which doesn't carry with it any of Refine's UI update functions. This 
 * replacement has to be used carefully though as some operations rely on 
 * previous updates being made (i.e. row-removals and row/column transposes 
 * require the data-table to be updated otherwise successive operations 
 * will fail to realise the old rows/columns have been changed).
 * 
 */
var LinkedGov = {

		/*
		 * Global variables used across multiple wizards
		 */
		vars : {
			debug:true,
			separator: "<LG>",
			nullValue:"<LG_NULL>",
			blanksSetToNulls:false,
			rdfSchema:{
				prefixes:[],
				baseUri:"http://127.0.0.1:3333/",
				rootNodes:[]
			}
		},

		/*
		 * initialise
		 * 
		 * Initial styling and injections
		 */
		initialise: function() {

			this.restyle();
			this.injectTypingPanel();
			this.injectWizardProgressOverlay();
			this.quickTools();
			this.applyTypeIcons.init();
		},

		/*
		 * restyle
		 * 
		 * Any major initial restyling
		 */
		restyle: function() {
			/*
			 * Giving the body our own class applies our CSS rules.
			 */
			$("body").addClass("lg");
			/*$("a#app-home-button img").attr("src","extension/linkedgov/images/duck.jpg")
			.attr("width","35")
			.css("margin-left","10px")
			.css("margin-top","-4px");*/
		},

		/*
		 * injectTypingPanel
		 * 
		 * Injects the Typing panel HTML and JS into the page
		 */
		injectTypingPanel: function() {

			// Create the Typing tab
			$(".refine-tabs ul li").eq(0).after('<li><a href="#refine-tabs-typing">Typing</a></li>');
			// Create the Typing panel div
			$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			// Load LinkedGov's Typing panel HTML into the div
			$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));

			$(window).unbind("resize");
			$(window).bind("resize",LinkedGov.resizeAll_LG);

		},

		/*
		 * Initialises the quick tools for column headings.
		 */
		quickTools:function(){

			/*
			 * Quick tools
			 * TODO: Show & hide using CSS.
			 */
			$("td.column-header").live("hover",function(){
				//if doesn't have a quick tool
				//then insert
				//else show or hide
				if(!$("table.data-table").hasClass("ui-selectable")){
					if($(this).hasClass("show")){
						$(this).find(".quick-tool").hide();
						$(this).addClass("hide").removeClass("show");
					} else if($(this).hasClass("hide")){
						$(this).find(".quick-tool").show();
						$(this).addClass("show").removeClass("hide");
					} else {

						var html = 
							"<div class='quick-tool'>" +
							"<ul>" +
							"<li class='rename'>Rename</li>" +
							"<li class='remove'>Remove</li>" +
							"<li class='move-left'>Move left</li>" +
							"<li class='move-right'>Move right</li>" +
							"</ul>" +
							"</div>";

						$(this).append(html);
						$(this).find(".quick-tool").show();
						$(this).addClass("qt").addClass("show");
					}
				}
			});

			$("div.quick-tool").find("li").live("click",function(e){

				var td = e.target.parentNode.parentNode.parentNode;
				var colName = $(td).find("span.column-header-name").html();

				switch($(this).attr("class")){

				case "rename" :
					var name = window.prompt("Name:",colName);
					if(name.length > 0){
						LinkedGov.renameColumn(colName,name,function(){
							Refine.update({modelsChanged:true});
						});
					}
					break;
				case "remove" : 
					LinkedGov.removeColumn(colName,function(){
						Refine.update({modelsChanged:true});
					});
					break;
				case "move-left" :
					LinkedGov.moveColumn(colName,"left",function(){
						Refine.update({modelsChanged:true});
					});
					break;
				case "move-right" :
					LinkedGov.moveColumn(colName,"right",function(){
						Refine.update({modelsChanged:true});
					});
					break;
				default : 
					break;

				}

			});

		},

		/*
		 * injectWizardProgressOverlay
		 * 
		 * Appends the wizard to the project page body, 
		 */
		injectWizardProgressOverlay:function(){
			$("body").append("<div class='wizardProgressMessage'><div class='overlay'><!-- --></div><p>Wizard in progress...<img src='images/large-spinner.gif' /></p></div>");
		},

		/*
		 * showWizardProgress
		 * 
		 * Shows or hides the wizard progress message.
		 */
		showWizardProgress:function(show){
			if(show){
				$('div.wizardProgressMessage').show();
				$("body").addClass("wizard-progress");
			}else{
				$('div.wizardProgressMessage').hide();
				$("body").removeClass("wizard-progress");
			}
		},
		
		/*
		 * getRDFSchema
		 * 
		 * Returns the RDF plugin schema (if there is one), otherwise 
		 * returns our skeleton of the schema to begin the first RDF operations on.
		 */
		getRDFSchema:function(){
			if(typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined'){
				LinkedGov.vars.rdfSchema = theProject.overlayModels.rdfSchema;
				return theProject.overlayModels.rdfSchema;
			}else {
				return LinkedGov.vars.rdfSchema;
			}
		},

		/*
		 * 
		 * resizeAll
		 * 
		 * 
		 * The top-level resizeAll function doesn't resize our typing panel, so 
		 * we need to include the typing panel's resize function in this function.
		 * 
		 * This function is bound to the $(window).resize() function in the 
		 * $(document).ready block at the end of this file.
		 */
		resizeAll_LG: function() {

			/*
			 * Call the old resizeAll function - found in the 
			 * core project.js file.
			 */
			resizeAll();
			/*
			 * Call our additional resize functions.
			 */

			/*
			 * TODO:
			 * Use this CSS instead of a JS resize:
			 * bottom: 0;
			 * height: auto !important;
			 * top: 28px;
			 */
			//ui.typingPanel.resize(); 
		},

		/*
		 * setFacetCountLimit
		 * 
		 * Sets the facet count limit. 
		 * 
		 * If a facet has more than 100 values - it won't display / 
		 * return an error in the JSON object.
		 * 
		 * Sometimes we will need to adjust this to perform operations.
		 */
		setFacetCountLimit: function(n){

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "set-preference",
				data:{
					name : "ui.browsing.listFacet.limit",
					value : n
				},
				success:function(o) {
					if (o.code == "ok") {
						ui.browsingEngine.update();
					} else if (o.code == "error") {
						alert(o.message);
					}
				},
				error:function(){
					alert("A problem was encountered when setting the facet count limit.");
				}
			});

		},

		/*
		 * setBlanksToNulls
		 * 
		 * Recursive function that applies a text-transform expression to each 
		 * column cell, setting any blank cells to the LinkdeGov's global 'nullValue' variable.
		 * 
		 * Usually called at the start of a wizard to avoid "fill-down" and "row-
		 * remove" issues.
		 */
		setBlanksToNulls: function(toNulls,columns,i,callback){

			var self = this;
			var expr = "";

			/*
			 * Change the expression used depending on the boolean "toNulls" passed 
			 * to the function.
			 */
			if(toNulls){
				// Set cells to null
				expr = "if(isBlank(value),\""+LinkedGov.vars.nullValue+"\",value)";
			} else {
				// Set cells to blank
				expr = "if(value==\""+LinkedGov.vars.nullValue+"\",blank,value)";				
			}

			/*
			 * If we haven't iterated through all of the columns yet
			 */
			if(i < columns.length){

				/*
				 * Post a text-transform process using the isBlank expression, replacing 
				 * any blanks with our separator.
				 */
				LinkedGov.silentProcessCall({
					type:"POST",
					url:"/command/" + "core" + "/" + "text-transform",
					data:{
						columnName: columns[i].name, 
						expression: expr, 
						onError: "keep-original",
						repeat: false,
						repeatCount: 10
					},
					success:function(){
						i = i+1;
						self.setBlanksToNulls(toNulls,columns,i,callback);
					},
					error:function(){
						alert("A problem was encountered when performing a text-transform on the column: \""+columns[i].name+"\".");
					}
				});

			} else {
				log("setBlanksToNulls complete");
				/*
				 * Set a global flag that we have set blanks to null
				 */
				if(toNulls){
					self.vars.blanksSetToNulls = true;
				} else {
					self.vars.blanksSetToNulls = false;
				}

				Refine.update({cellsChanged:true},callback);
			}

		},

		/*
		 * Renames a column
		 */
		renameColumn:function(oldName,newName,callback){
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "rename-column",
				data:{
					oldColumnName: oldName,
					newColumnName: newName
				},
				success:callback,
				error:function(){
					alert("A problem was encountered when renaming the column: \""+oldName+"\".");
				}
			});
		},

		/*
		 * Removes a column
		 */
		removeColumn:function(colName,callback){
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "remove-column",
				data:{
					columnName: colName
				},
				success:callback,
				error:function(){
					alert("A problem was encountered when removing the column: \""+colName+"\".");
				}
			});
		},

		/*
		 * Split a column
		 */
		splitColumn:function(colName,separator,callback){

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "split-column",
				data:{
					columnName: colName,
					mode: "separator",
					separator: separator,
					guessCellType: true,
					removeOriginalColumn: true,
					regex:false
				},
				success:function(){
					Refine.update({modelsChanged:true},function(){
						callback();	
					});
				},
				error:function(){
					alert("A problem was encountered when splitting the column: \""+colName+"\".");
				}
			});
		},

		/*
		 * Moves a column left or right
		 */
		moveColumn:function(colName,dir,callback){

			var i = Refine.columnNameToColumnIndex(colName)+(dir == "left" ? -1 : 1);

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "move-column",
				data:{
					columnName:colName,
					index:i
				},
				success:callback,
				error:function(){
					alert("A problem was encountered when moving the column: \""+colName+"\".");
				}
			});

		},

		/*
		 * resetWizard
		 * 
		 * Called once a wizard is complete.
		 * 
		 * Takes a wizard's body HTML element as a parameter 
		 * and resets it's options and settings.
		 */
		resetWizard: function(wizardBody){

			//Clear checkboxes
			$(wizardBody).find(":input").removeAttr('checked').removeAttr('selected');
			//Clear column selections
			$(wizardBody).find("ul.column-display").html("").hide();
			//Clear text fields
			$(wizardBody).find(":text").val("");

			//Make sure the wizard is displayed so the user can repeat the 
			//task if they wish
			//TODO: Don't need these any more
			$("a.wizard-header").removeClass("exp");
			$(wizardBody).prev("a.wizard-header").addClass("exp");
			$("div.wizard-body").hide();
			$(wizardBody).show();

			//Display the typing panel
			ui.leftPanelTabs.tabs({ selected: 1 });	

			// Scroll the top of the wizard into view.
			//$(wizardBody).parent().scrollTop($(wizardBody).prev("a.wizard-header").offset().top)

		},

		/*
		 * silentProcessCall
		 * 
		 * Performs an AJAX call to a Refine process without incurring a 
		 * UI update unless specified in the callback.
		 * 
		 * This is helpful when stringing together lots of process calls at once,
		 * where only one UI update is needed to reflect the changes made in the table.
		 * 
		 * o = the ajax object
		 */
		silentProcessCall: function(o){

			o.type = o.type || "POST";
			o.dataType = o.dataType || "json";
			o.url = o.url || "";
			o.data = o.data || "";			
			o.success = o.success || {};
			o.error = o.error || {};

			o.data.project = theProject.id;
			o.data = $.param(o.data);

			$.ajax(o);

			return false;

		},

		/*
		 * loadHTMLCallback
		 * 
		 * Called each time HTML is loaded, either through LinkedGov or 
		 * Refine.
		 */
		loadHTMLCallback: function(htmlPage) {

			//log(htmlPage+" has been loaded");
			/*
			 * Strip the HTML location down to it's name
			 */
			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			var pageName = htmlPage.replace(".html","");

			switch(pageName) {

			case 'typing-panel' :
				// Inject LinkedGov's Typing panel JS into the page
				$.getScript(ModuleWirings["linkedgov"] + 'scripts/project/typing-panel.js');
				break;

			default:
				break;
			}

			return false;
		}

};


/*
 * multipleColumnsWizard
 * 
 * Rotates columns to rows (i.e. 24 columns labelled by the hour, 
 * rotated into one column named "Time" with 24 values per every 
 * original row).
 * 
 * The user is asked to select the range of columns to rotate, from 
 * that the following parameters are passed to the wizard:
 * 
 * a) startColName - The column name at the start of the range of columns
 * b) colCount - The number of columns in the range
 * c) newColName - The name for the new column (input by user)
 * 
 * 
 * Operation steps:
 * 
 * 1. initialise()
 * Store global variables, set facet limit and check for blank cells 
 * before beginning the operation.
 * 
 * 2. reorderColumns()
 * If there are any gaps in the range of columns, we move the columns to 
 * skip to the beginning of the range before transposing.
 * 
 * 3. transposeColumns()
 * Transposes the range of column headers into one column, with each cell 
 * using the global LinkedGov 'separator' variable and each column's value.
 * 
 * 4. splitColumns()
 * Splits the newly created column into two columns using the global 
 * LinkedGov 'separator' variable.
 * 
 * 5. fillDownColumns()
 * Fills in all the blank cells as a result of the rotate.
 *
 */
LinkedGov.multipleColumnsWizard = {

		vars : {
			startColName:"",
			newColName:"",
			colCount:0,
			gapInRange:false,
			colsToSkip:[],
			elmts:{}
		},

		/*
		 * initialise
		 * 
		 * Fills any blank cells with null values before beginning 
		 * the rotate operation.
		 */
		initialise: function(elmts){

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			log("Starting multipleColumnsWizard");

			/*
			 * Recalculate which columns are going to be transposed, 
			 * taking into account any columns the user wants to skip.
			 */
			self.checkSkippedColumns();

			/*
			 * Set any blank cells to null to protect them from being filled down into 
			 * after the transpose operation (which produces blank cells).
			 * 
			 * Passing self.transpose() as a parameter calls it immediately for some reason.
			 */
			LinkedGov.setBlanksToNulls(true,theProject.columnModel.columns,0,function(){
				/*
				 * If a gap has been detected, reorder the columns first.
				 */
				if(self.vars.gapInRange){
					self.reorderColumns(Refine.columnNameToColumnIndex(self.vars.startColName),function(){
						self.transposeColumns();
					});
				} else {
					self.transposeColumns();
				}
			});

		},

		/*
		 * Recalculates the parameters for the transpose process such as 
		 * how many columns to transpose, the start index and any columns 
		 * to skip.
		 */
		checkSkippedColumns:function(){

			var self = this;
			var elmts = self.vars.elmts;

			log("Before:");
			log($(elmts.multipleColumnsColumns).children("li"));

			/*
			 * Loop through the user's selected columns and trim any 
			 * columns that have been marked as "skip" from the beginning
			 * and end.
			 */
			for(var i=0; i<$(elmts.multipleColumnsColumns).children("li").length; i++){				
				/*
				 * If a selected column has been removed, but was at the beginning, remove it from the 
				 * array of columns.
				 */
				if($($(elmts.multipleColumnsColumns).children("li")[i]).hasClass("skip") && i == 0){
					$($(elmts.multipleColumnsColumns).children("li")[i]).remove();
					i--;
					/*
					 * If a selected column has been removed, but was at the end, remove it from the array 
					 * of columns.
					 */
				} else if($($(elmts.multipleColumnsColumns).children("li")[i]).hasClass("skip") 
						&& i == $(elmts.multipleColumnsColumns).children("li").length-1){
					$($(elmts.multipleColumnsColumns).children("li")[i]).remove();
					i--;
					i--;
				}
			}
			log("After:");
			log($(elmts.multipleColumnsColumns).children("li"));

			/*
			 * Once trimmed, the array should only contain columns to skip after and before the start 
			 * and end columns, so reassess which columns need to be skipped and populate the 
			 * "colsToSkip" array.
			 */
			for(var j=0, len=$(elmts.multipleColumnsColumns).children("li").length; j<len; j++){
				if($($(elmts.multipleColumnsColumns).children("li")[j]).hasClass("skip")){
					self.vars.colsToSkip.push($($(elmts.multipleColumnsColumns).children("li")[j]).find("span.col").html());
					self.vars.gapInRange = true;					
				}
			}

			log("colsToSkip:");
			log(self.vars.colsToSkip);

			/*
			 * Recalculate how many columns to transpose.
			 */
			self.vars.startColName = $(elmts.multipleColumnsColumns).children("li").eq(0).find("span.col").html();
			self.vars.colCount = $(elmts.multipleColumnsColumns).children("li").length - self.vars.colsToSkip.length;
			self.vars.newColName = window.prompt("New column name:", "");
		},

		/*
		 * reorderColumns
		 * 
		 * Recursive function. 
		 * 
		 * In case there is a gap in the range of columns selected,
		 * the columns will have to be reordered before the transpose 
		 * can begin.
		 * 
		 * Takes the index to start moving the columns to and a callback to 
		 * call once complete.
		 * 
		 * Once complete, this should result in all "skipped" columns appearing 
		 * to the left of the columns to transpose.
		 */
		reorderColumns: function(colIndex,callback){

			var self = this;

			//log("reorderColumns");

			if(self.vars.colsToSkip.length > 0){

				LinkedGov.silentProcessCall({
					type:"POST",
					url:"/command/" + "core" + "/" + "move-column",
					data:{
						columnName:self.vars.colsToSkip[0],
						index:colIndex,
					},
					success:function(){
						/*
						 * Increment the index to move the next column to.
						 * Remove the column that's just been moved from the 
						 * "colsToSkip" array.
						 * Recurse.
						 */
						colIndex = colIndex+1;
						self.vars.colsToSkip.splice(0,1);
						self.reorderColumns(colIndex,callback);
					},
					error:function(){
						self.onFail("A problem was encountered when reordering the columns.");
					}
				});

			} else {
				/*
				 * Perform a model UI update (when columns change) and proceed 
				 * to the next operation.
				 */
				Refine.update({modelsChanged:true},callback);
			}
		},

		/*
		 * transposeColumns
		 * 
		 * Create a transpose config object using the wizard's 
		 * global column name variables and posts it to Refine.
		 * 
		 */
		transposeColumns: function(){

			log("transposeColumns");

			var self = this;

			/* 
			 * Instead of using Refine.postCoreProcess(), we post the transpose 
			 * process as a more silent "AJAX" call without the default UI update 
			 * callbacks.
			 */			
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "transpose-columns-into-rows",
				data:{
					startColumnName: self.vars.startColName,
					columnCount: self.vars.colCount,
					combinedColumnName: self.vars.newColName,
					prependColumnName: true,
					separator: LinkedGov.vars.separator,
					ignoreBlankCells: true
				},
				success:function(){
					/*
					 * Perform a silent UI update before calling the 
					 * next operation.
					 */
					Refine.reinitializeProjectData(function(){
						ui.dataTableView.update(function(){
							ui.browsingEngine.update(self.splitColumns());
						});
					});
				},
				error:function(){
					self.onFail("A problem was encountered when transposing the columns.");
				}
			});

		},

		/*
		 * splitColumns
		 * 
		 * Splits the newly created column using the global 
		 * LinkedGov separator.
		 */
		splitColumns: function(){

			log("splitColumns");

			var self = this;

			/*
			 * Post a silent "split-column" process call (without the default UI update callbacks).
			 * 
			 * After splitting the columns, the transpose has left us with lots of blank cells 
			 * which need to be filled down.
			 */

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "split-column",
				data:{
					columnName: self.vars.newColName,
					mode: "separator",
					separator: LinkedGov.vars.separator,
					guessCellType: true,
					removeOriginalColumn: true,
					regex:false
				},
				success:function(){
					Refine.update({modelsChanged:true},function(){
						self.fillDownColumns(theProject.columnModel.columns,0);	
					});
				},
				error:function(){
					self.onFail("A problem was encountered when splitting the columns.");
				}
			});

		},

		/*
		 * fillDownColumns
		 * 
		 * A recursive function that takes the column model's 
		 * list of columns and an iterator as parameters.
		 * 
		 * Only fills a column if it's name is not equal to the columns being 
		 * operated on. The column suffixes +" 1" and +" 2" are always the same after a 
		 * column split.
		 * 
		 */
		fillDownColumns:function(columns,i){

			var self = this;

			//log("fillDownColumns");
			//log(i);
			//log(columns);
			//log("-----------------------------");

			if(i < columns.length) {

				//log("columns[i].name: "+columns[i].name);
				//log("self.vars.newColName: "+self.vars.newColName);

				if(columns[i].name != self.vars.newColName 
						&& columns[i].name != self.vars.newColName+" 1" 
						&& columns[i].name != self.vars.newColName+" 2"){

					LinkedGov.silentProcessCall({
						type:"POST",
						url:"/command/" + "core" + "/" + "fill-down",
						data:{
							columnName: columns[i].name
						},
						success:function(){
							i = i+1;
							self.fillDownColumns(columns,i);
						},
						error:function(){
							self.onFail("A problem was encountered when filling-down the columns.");
						}
					});

				} else {
					i = i+1;
					self.fillDownColumns(columns,i);					
				}
			} else {
				log("filDownColumns complete, i = "+i);		
				self.onComplete();
			}

		},

		/*
		 * onComplete
		 * 
		 * Sets any null values back to blank and performs a full 
		 * update.
		 */
		onComplete:function(){

			var self = this;

			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				log("Multiple columns wizard complete");
				Refine.update({everythingChanged:true});
				// Refresh the content of the select inputs
				ui.typingPanel.rangeSelector($(self.vars.elmts.multipleColumnsBody).find("div.range").find("select").eq(0));
				LinkedGov.resetWizard(self.vars.elmts.multipleColumnsBody);
				ui.typingPanel.populateRangeSelector();
				LinkedGov.showWizardProgress(false);
			});

			return false;
		},

		onFail:function(message){
			var self = this;
			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				log("Multiple columns wizard failed.\n\n"+message);
				Refine.update({everythingChanged:true});
				LinkedGov.resetWizard(self.vars.elmts.multipleColumnsBody);
				LinkedGov.showWizardProgress(false);
			});			
		}

};

/*
 * multipleValuesWizard
 * 
 * Wizard for transposing a column of multiple values into a set of 
 * new headed columns. The user is asked to select three types of column:
 * 
 * a) headersColName - The column that contains the new header names
 * b) valuesColName - The column that contains the values for the new columns
 * c) colNamesToExclude - Columns that contain values/measurements to avoid
 * 
 * 1. initialise()
 * Store variables, set facet limit and check for blank cells 
 * before beginning the operation.
 * 
 * 2. findSortableColumnHeaders()
 * Find out which column headers are to be used in the "sort", 
 * which allows us to create a patterned situation for the transpose.
 * 
 * 3. reorderRows()
 * Create a sorting object that contains the relevant columns in the 
 * correct order and post the "reorder rows permanently" process.
 * 
 * 4. multiValueTranspose()
 * Use a facet on the 'headers' column to find out how many unique values
 * there are. This number is used as a the "how many rows to transpose by" 
 * parameter. The 'transpose-rows' process is then posted.
 * 
 * 5. removeBlankRows()
 * With blank rows now occurring throughout the data, use an "isBlank" facet 
 * on one of the new columns and post the "remove-all-matching-rows" process.
 * 
 * 6. getNewColumnHeaders()
 * Creates an array of the newly created column names to pass to the next 
 * step.
 * 
 * 7. renameMultipleColumns()
 * Rename the new columns using the unique values from the headers column. 
 * Refine adds iterative integers beginning at "1" for each newly created 
 * column.
 * 
 * 8. removeHeadersColumn()
 * Discard the headers column that contains the new header values.
 * 
 */
LinkedGov.multipleValuesWizard = {

		vars:{
			headersColName:"",
			valuesColName:"",
			colsToExclude:[],
			newHeaders:[],
			abortOperation:false,
			abortMessage:"",
			elmts:{}
		},

		/*
		 * initialise
		 * 
		 * Set the facet choice count limit high enough to avoid any 
		 * returned errors when counting unique values for sorting by 
		 * columns.
		 * 
		 */
		initialise: function(elmts) {

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			//LinkedGov.setFacetCountLimit(1000);

			// Store the column containing the new column header values
			self.vars.headersColName = $(elmts.multipleValuesColumns).children("li").eq(0).find("span.col").html();
			// Store the column containing the values for the new columns
			self.vars.valuesColName = $(elmts.multipleValuesColumns2).children("li").eq(0).find("span.col").html();
			/*
			 * Store the columns to exclude from the operation (e.g. a totals column)
			 */ 
			$(elmts.multipleValuesColumns3).children("li").each(function(){
				self.vars.colsToExclude.push($(this).find("span.col").html())
			});

			/*
			 * Set blank cells to bull before starting the operation, call the first wizard 
			 * operation once complete.
			 */
			LinkedGov.setBlanksToNulls(true,theProject.columnModel.columns,0,function(){
				self.findSortableColumnHeaders();
			});

		},

		/*
		 * findSortableColumnHeaders
		 * 
		 * For each column header that isn't involved in the transpose 
		 * - Find out how many unique values each column has
		 * - Push the column names into the sortingObject in order, starting 
		 * with the column with the highest number of unique values.
		 * 
		 */
		findSortableColumnHeaders: function(){

			log("findSortableColumnHeaders");

			var self = this;

			var colHeaders = [];

			/*
			 * - Loop through each of the project's column objects
			 * - Check to see if the column name is not equal to the column 
			 * we're operating on and whether there are any column names to 
			 * exclude, otherwise store it as a good column name to sort on.
			 * - If the column name is good but there are columns to exclude, 
			 * we need to check whether this column name exists in the exclude 
			 * array before storing it.
			 */
			$.each(theProject.columnModel.columns,function(key,value){

				//log("self.vars.valuesColName:");
				//log(self.vars.valuesColName);
				//log("self.vars.headersColName:");
				//log(self.vars.headersColName);
				//log("value.name");
				//log(value.name);

				if(value.name != self.vars.valuesColName && $.inArray(value.name, self.vars.colsToExclude) < 0){
					colHeaders.push(value.name);
				}
			});

			log("Sortable column headers");
			log(colHeaders);

			/*
			 * Sort the columns to produce a 'grouped' situation amongst the rows.
			 * 
			 * Pass a callback function that reorders the columns by the number of 
			 * their unique values.
			 */
			self.columnCountUniqueValues(colHeaders,[],function(colCountObj){
				self.sortColumnsByUniqueValue(colCountObj);
			});
		},

		/*
		 * columnCountUniqueValues
		 * 
		 * A recursive function that posts a silent "compute-facet" call to 
		 * retrieve information about the number of unique values in each 
		 * column. The silent call avoids any facets being created and removed 
		 * on the screen.
		 * 
		 * When done, it passes an array of object key-value pairs containing 
		 * the column names and their unique values to the next operation.
		 */
		columnCountUniqueValues: function(colHeaders,colCountObj,callback){

			var self = this;

			var colCountObj = colCountObj || [];

			//log("-----------------------------------")
			//log("columnCountUniqueValues:");
			//log(colHeaders);
			//log(ans);

			/*
			 * While we still have columns to iterate through
			 */
			if(colHeaders.length > 0){

				/*
				 * Build a parameter object using the first of the column
				 * names.
				 */
				var facetParams = {
						"facets":[
						          {"type":"list",
						        	  "name":colHeaders[0],
						        	  "columnName":colHeaders[0],
						        	  "expression":"value",
						        	  "omitBlank":false,
						        	  "omitError":false,
						        	  "selection":[],
						        	  "selectBlank":false,
						        	  "selectError":false,
						        	  "invert":false
						          }
						          ],
						          "mode":"row-based"
				};



				LinkedGov.silentProcessCall({
					type:"POST",
					url:"/command/" + "core" + "/" + "compute-facets",
					data:{
						engine: JSON.stringify(facetParams)
					},
					success:function(data) {

						// Initialise column's unique value count at 0
						var values = 0;

						/*
						 * Loop through the UI facets
						 */
						for(var h=0; h<data.facets.length; h++){
							/*
							 * If the facet matches the column name and has choices returned
							 */
							if(data.facets[h].columnName == colHeaders[0] && typeof data.facets[h].choices != 'undefined'){
								/*
								 * Store the number of facets choices as the number of the column's 
								 * unique values
								 */
								values = data.facets[h].choices.length;

								/*
								 * Check that the headersCol's values have the same number of values each, 
								 * if they don't, then the transpose will not work unless the 'missing' 
								 * rows are added.
								 */
								//log(data.facets[h].columnName + '==' + self.vars.headersColName);
								if(data.facets[h].columnName == self.vars.headersColName){
									log("here");
									for(var i=0; i<(values-1); i++){
										log("i="+i);
										if(data.facets[h].choices[i].c != data.facets[h].choices[i+1].c){
											self.vars.abortMessage = "Cannot proceed. There aren't an even number of " +
											"values in the "+self.vars.headersColName+" column.";
											self.vars.abortOperation = true;
										}
									}

								}
							}
						}

						/*
						 * If the "compute-facets" post returns an error because a column has 
						 * more than 100 unique values in, set the column's unique value count 
						 * to "9999" (similar to placing the column at the front of the sorting 
						 * order).
						 */
						if(values == 0){
							values = "9999";
						}

						/*
						 * Push the name/unique value count object into 
						 * an array.
						 */
						colCountObj.push({
							name: colHeaders[0],
							count: values
						});

						//log('colHeaders');
						//log(colHeaders);
						//log('ans');
						//log(ans);
						//log('colHeaders.length');
						//log(colHeaders.length);

						/*
						 * Remove the column that's just been used
						 */
						colHeaders.splice(0,1);

						if(!self.vars.abortOperation){
							self.columnCountUniqueValues(colHeaders,colCountObj,callback);
						} else {
							colHeaders = [];
							self.onFail("A problem was encountered when computing facets.");
						}
					},
					error:function(){
						self.onFail("A problem was encountered when computing facets.");
					}
				});

			} else {
				//log("colHeaders length is 0");
				/*
				 * Call the callback function using the array of column 
				 * names/unique value objects.
				 */
				callback(colCountObj);
			}
		},

		/*
		 * sortColumnsByUniqueValue
		 * 
		 * Takes an array of column objects {name, unique value count} 
		 * and creates a new array of just column names in order of 
		 * their unique values.
		 * 
		 * Passes the array to the reordering operation.
		 */
		sortColumnsByUniqueValue:function(colCountObj){

			var self = this;

			//log('colCountObj');
			//log(colCountObj);

			// Temp var for storing the highest unique value
			var highest = 0;
			// The new array of column names
			var columnHeadersByUniqueValue = [];

			var len = colCountObj.length;
			for(var a=0; a<len; a++){
				if(colCountObj[a].count > highest){
					columnHeadersByUniqueValue.splice(0,0,colCountObj[a].name);
					highest = colCountObj[a].count;
				} else {
					columnHeadersByUniqueValue.splice(1,0,colCountObj[a].name);
				}
			}

			log('Column headers by unique value: '+columnHeadersByUniqueValue);

			self.reorderRows(columnHeadersByUniqueValue);
		},

		/*
		 * reorderRows
		 * 
		 * Reorders the rows to produce a 'grouped' situation - ready for 
		 * transposing multiple values.
		 * 
		 * A sorting object has to be created with the relevant "sort criteria" 
		 * objects inside it - in order. This is passed as a parameter to the 
		 * "reorder-rows" process post.
		 * 
		 * TODO : Issue with there not being an even number of unique value
		 * rows. A Java servlet will provide functionality to "add" any missing 
		 * rows of data - essentially "filling" out the dataset with missing data 
		 * dependent on the column the user has selected for transposing (headersCol).
		 */
		reorderRows: function(columnHeadersByUniqueValue){

			log("reorderRows");

			var self = this;

			var sortingObject = {
					criteria:[]
			};

			/*
			 * Create an array of sorting configurations, at the 
			 * same time as checking the column exists in the column 
			 * data.
			 */
			var columns = theProject.columnModel.columns;
			for(var h=0; h<columnHeadersByUniqueValue.length;h++){
				for(var i=0; i<columns.length; i++){				
					if(columns[i].name == columnHeadersByUniqueValue[h]){
						sortingObject.criteria.push({
							column:columns[i].name,
							valueType:"string",
							reverse:false,
							blankPosition:2,
							errorPosition:1,
							caseSensitive:false
						});
					}

				}			
			}

			log('sortingObject:');
			log(sortingObject);


			/*
			 * Post a silent "reorder-rows" call - remembering to include the 'theProject' 
			 * parameter.
			 */			
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "reorder-rows",
				data:{
					sorting : JSON.stringify(sortingObject)
				},
				success:function(){
					self.multiValueTranspose();
				},
				error:function(){
					self.onFail("A problem was encountered when reordering rows.");
				}
			});		

		},

		/*
		 * multiValueTranspose
		 * 
		 * Before transposing rows, we need to know how many rows to 
		 * transpose by - this number is equivalent to the number of 
		 * unique values in the multi-valued column.
		 * 
		 * The facet functionality from before is used to get this number.
		 * 
		 * The labels of the unique values in the facet are also extracted 
		 * and used as the new headers for renaming the new columns later on.
		 */
		multiValueTranspose:function(){

			var self = this;

			log("multiValueTranspose beginning");

			/*
			 * Create a facet parameter object using the global 
			 * column name to transpose.
			 */
			var facetParams = {
					"facets":[
					          {"type":"list",
					        	  "name":self.vars.headersColName,
					        	  "columnName":self.vars.headersColName,
					        	  "expression":"value",
					        	  "omitBlank":false,
					        	  "omitError":false,
					        	  "selection":[],
					        	  "selectBlank":false,
					        	  "selectError":false,
					        	  "invert":false
					          }
					          ],
					          "mode":"row-based"
			};



			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "compute-facets",
				data:{
					engine: JSON.stringify(facetParams)
				},
				success:function(data) {

					//log("data");
					//log(data);

					for(var h=0;h<data.facets.length;h++){
						if(data.facets[h].columnName == self.vars.headersColName){
							if(typeof data.facets[h].choices != 'undefined'){

								/*
								 * If there are less than 100 unique values in the column to transpose, 
								 * store them as column names in an array to use to rename the newly 
								 * transposed columns.
								 */
								for(var i=0;i<data.facets[h].choices.length;i++){
									self.vars.newHeaders.push(data.facets[h].choices[i].v.l);
								}
							} else {
								/*
								 * If there are more than 100 unique values in the column to transpose, 
								 * abort and tell the user they can't proceed with the wizard because they 
								 * are trying to transpose too many rows to columns.
								 */
								log("Aborting multiple values wizard - facet count limit reached.")
								self.vars.abortOperation = true;
							}
						}
					}

					/*
					 * If there was an issue with using the facet, abort, otherwise continue.
					 */
					if(!self.vars.abortOperation){
						log("transposing...");
						/*
						 * Post a silent "transpose" call, performing a minor UI update as a callback,
						 * before proceeding the next operation.
						 */						
						LinkedGov.silentProcessCall({
							type:"POST",
							url:"/command/" + "core" + "/" + "transpose-rows-into-columns",
							data:{
								columnName:self.vars.valuesColName,
								rowCount:self.vars.newHeaders.length
							},
							success:function(){
								Refine.update({modelsChanged:true},function(){
									self.removeBlankRows();				
								});
							},
							error:function(){
								self.onFail("A problem was encountered when transposing rows.");
							}
						});	
					} else {
						self.onFail("A problem was encountered when computing facets.\n\nThere are too many values being transposed. " +
						"The maximum number of unique values (or rows) to transpose is 100");
					}
				},
				error:function(){
					self.onFail("A problem was encountered when computing facets.");
				}
			});		

		},

		/*
		 * removeBlankRows
		 * 
		 * A large number of blank rows have been generated from the transpose
		 * which need to be removed.
		 * 
		 * Facet functionality is used again. By creating a facet on one of the new 
		 * columns using the "isBlank" expression, the data table is updated to show 
		 * only the blank rows which are to be removed.
		 * 
		 * Because the facet generated will only display "true" and "false" choices, 
		 * there's no worry of the facet count limit being reached.
		 */
		removeBlankRows:function(){

			var self = this;

			/*
			 *  It doesn't seem possible to use the facet functionality "behind-the-scenes" 
			 *  for this particular operation. We need to actually update the data table, so 
			 *  a facet has to be added to the UI.
			 */
			ui.browsingEngine.addFacet(
					"list",
					{
						"name": self.vars.valuesColName+" 1",
						"columnName": self.vars.valuesColName+" 1",
						"expression": "isBlank(value)"
					}
			);

			var facets = ui.browsingEngine._facets;
			// For each possible facet on the screen
			for(var i=0; i < facets.length; i++){

				log(facets[i].facet._config.columnName);

				// Find the facet that we have just created.
				// The first of the transposed columns will not have the same name
				// as the value stored in the column we the user selected to transpose.
				if(facets[i].facet._config.columnName == self.vars.valuesColName+" 1"){

					// Store the facet so we can remove it later
					var blankFacet = facets[i].facet;

					// Check that the facet UI has been created using an interval
					// TODO: Try to remove the use of an interval.
					var myInterval = setInterval(function(){
						if(blankFacet._data != null){

							// Check to see if there are both true and false values
							// The only case where there would be one "true" or "false" 
							// value, is where only a single value was transposed.
							// E.g. "electricity" as opposed to "electricity, gas, heat".
							if(blankFacet._data.choices.length > 1){

								// Find the "true" value					
								for(var j=0;j<blankFacet._data.choices.length;j++){
									if(blankFacet._data.choices[j].v.l === "true"){

										// Invoke a selection action on that facet choice
										blankFacet._selection.push(blankFacet._data.choices[j]);

										// Remove the matching rows
										// Have to use the postCoreProcess function here as 
										// the rows are removed using Refine's facet-list JSON object
										Refine.postCoreProcess("remove-rows", {}, null, { rowMetadataChanged: true }, {
											onDone:function(){
												// Pass boolean "true" if multi-values are transposed.
												self.getNewColumnHeaders(blankFacet,true);
											}
										});
									}
								}
							} else {
								// Only one choice, must have been a single value type, 
								// so no rows to remove.
								// Pass a count of 0 if a single value is transposed
								self.getNewColumnHeaders(blankFacet,false);
							}
							clearInterval(myInterval);
						} else {
							// wait for facet UI to complete creation
							log("Blank facet isn't set up yet, waiting 1 second...");
						}
					},1000);
				}
			}		
		},


		/*
		 * getNewColumnHeaders
		 * 
		 * Creates an array with the names of the newly created columns in, 
		 * which is then passed to the renameMultipleColumns function so they 
		 * can be renamed using the unique values in the "headers" column.
		 */
		getNewColumnHeaders:function(blankFacet, multiValues){

			var self = this;

			/* 
			 * Remove the "isBlank" facet to bring the remaning rows back 
			 * into view.
			 */
			ui.browsingEngine.removeFacet(blankFacet);

			/* 
			 * Perform a UI update to make sure the rows have reappeared.
			 * 
			 * Create an array of old column names. Refine suffixes an int  
			 * beginning at '1' for each transposed column.
			 */
			Refine.update({ everythingChanged: true },function(){

				var oldHeaders = [];
				var columns = theProject.columnModel.columns;
				// Refine adds incremental int's to newly created columns with the same
				// name.
				var count = 1;
				for(var k=0; k<columns.length;k++){
					if(multiValues){
						if(columns[k].name == self.vars.valuesColName+" "+count){
							oldHeaders.push(columns[k].name);
							count++;
						}
					} else {						
						if(columns[k].name == self.vars.valuesColName+" 1"){
							oldHeaders.push(columns[k].name);
							k=columns.length;
						}
					}
				}

				/*
				 * Sort the array of new header names (unique values from the headers 
				 * column), so they map correctly to the newly created transposed 
				 * columns (which were sorted into alphabetical order during the sort 
				 * operation).
				 */
				self.vars.newHeaders.sort();

				self.renameMultipleColumns(oldHeaders,self.vars.newHeaders);
			});
		},

		/*
		 * renameMultipleColumns
		 * 
		 * Recursive function that takes two arrays as parameters. 
		 * One array for the old column names, and the second array for 
		 * the new column names.
		 * 
		 */
		renameMultipleColumns: function(oldNames, newNames){

			var self = this;

			//log('oldNames');
			//log(oldNames);
			//log('newNames');
			//log(newNames);

			/*
			 * If there are still column names to rename
			 */
			if(oldNames.length > 0 && newNames.length > 0){

				/*
				 * Post a silent "rename" call
				 */
				LinkedGov.silentProcessCall({
					type:"POST",
					url:"/command/" + "core" + "/" + "rename-column",
					data:{
						oldColumnName: oldNames[0],
						newColumnName: newNames[0]
					},
					success:function(){
						/*
						 * Removes the two column names that have just been used from 
						 * the arrays.
						 */
						oldNames.splice(0,1);
						newNames.splice(0,1);
						/*
						 * Check if those were the last values in the arrays,
						 * if so, proceed to the next operation, otherwise, 
						 * recurse.
						 */
						if(oldNames.length > 0 && newNames.length > 0){
							self.renameMultipleColumns(oldNames,newNames);
						} else {
							self.removeHeadersColumn();
						}				
					},
					error:function(){
						self.onFail("A problem was encountered when renaming the column: \""+oldNames[0]+"\" to \""+newNames[0]+"\".");
					}
				});	

			} else {
				log("No more columns to rename");
			}
		},

		/*
		 * removeHeadersColumn
		 * 
		 * Removes the column containing the values for the new column 
		 * headers.
		 */
		removeHeadersColumn:function(){

			var self = this;

			log("removeHeadersColumn");

			/*
			 * Post a silent "remove-column" call.
			 */
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "remove-column",
				data:{
					columnName: self.vars.headersColName
				},
				success:function(){
					self.onComplete();			
				},
				error:function(){
					self.onFail("A problem was encountered when removing the column: \""+self.vars.headersColName+"\".");
				}
			});	
		},

		/*
		 * onComplete
		 * 
		 * Sets any null cells back to being blank, dismisses any "Working..." 
		 * messages, resets the facet count limit and performs an update.
		 */
		onComplete:function(){

			var self = this;

			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				DialogSystem.dismissAll();
				//LinkedGov.setFacetCountLimit(100);
				Refine.update({everythingChanged:true});
				LinkedGov.resetWizard(self.vars.elmts.multipleValuesBody);
				LinkedGov.showWizardProgress(false);
			});

			return false;
		},

		onFail:function(message){
			var self = this;
			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				alert("Multiple Values wizard failed. \n\n"+message);
				LinkedGov.resetWizard(self.vars.elmts.multipleValuesBody);	
				LinkedGov.showWizardProgress(false);
			});

		}

};


/*
 * dateTimeWizard
 * 
 * TODO: When producing RDF or exporting the dates into any format,
 * Refine's "date" object doesn't output as a string correctly.
 * 
 * simpleDate
 * 
 * fragmentedDate
 * 
 * simpleTime
 * 
 * fragmentedTime
 * 
 * buildExpression
 * 
 */
LinkedGov.dateTimeWizard = {

		vars:{
			columns:[],
			colFragments:[],
			elmts:{}
		},

		/*
		 * initialise
		 * 
		 * 
		 */
		initialise: function(elmts) {

			//log("here");
			//log(elmts);

			var self = this;
			self.vars.elmts = elmts;
			self.vars.columns = [];
			self.vars.colFragments = [];
			LinkedGov.showWizardProgress(true);

			/*
			 * Remove any skipped columns or columns that have no date fragments
			 * specified.
			 */
			self.vars.elmts.dateTimeColumns.children("li").each(function(){
				if($(this).hasClass("skip")){
					$(this).remove();
				} else {
					var checkedInputs = $(this).find("input:checked");
					if(checkedInputs.length < 1){
						$(this).remove();
					}
				}
			});

			self.buildCombinationStrings();

		},

		/*
		 * buildCombinationString
		 * 
		 * Construct a fragment string using the checked inputs.
		 */
		buildCombinationStrings:function(){

			/*
			 * Loop through each selected column and check for 
			 * date fragments starting with the largest fragment 
			 * first (i.e. Y,M,D,h,m,s).
			 * 
			 * We concatenate each date fragment into a string and then 
			 * test whether the fragments resemble a valid date or time.
			 * 
			 */

			var self = this;

			var cols = self.vars.elmts.dateTimeColumns.children("li");
			var value = "";
			var frags = ['Y','M','D','h','m','s'];

			var columnCombinations = [];

			/*
			 * Loop through the selected columns
			 */
			for(var i=0;i<cols.length;i++){
				/*
				 * Loop through their checked date fragments
				 */
				var checkedInputs = cols.eq(i).children("span.dateFrags").children('input:checked');
				//log("checkedInputs:");
				//log(checkedInputs);
				for(var j=0;j<checkedInputs.length;j++){
					value += checkedInputs.eq(j).val()+"-";
				}
				value = value.substring(0,value.length-1);
				//log(value);
				var mb4d = cols.eq(i).children("span.mb4d").find('input.mb4d').attr('checked');

				columnCombinations.push({
					name:cols.eq(i).find('span.col').html(),
					combi:value,
					monthBeforeDay:mb4d
				});

				value = "";
			}

			log("columnCombinations");
			log(columnCombinations);

			self.checkCombinations(columnCombinations);

		},		

		/*
		 * checkCombinations
		 * 
		 * Check the combination strings for the columns and decide 
		 * what action to take.
		 *  
		 * toDate(value,boolean) - boolean signals whether the day is 
		 * before the month.
		 */
		checkCombinations:function(colCombinations){

			var self = this;

			/*
			 * Check for the 3 simplest combinations that have every fragment in a 
			 * different column:
			 * 
			 * Y/M/D, h/m/s, and Y/M/D/h/m/s
			 */
			if(colCombinations.length == 3){

				/*
				 * Check for a simple day, month, year combination
				 */
				if(colCombinations[0].combi == "Y" || colCombinations[0].combi == "M" || colCombinations[0].combi == "D"){
					var fragCount=0;
					var frags = ['Y','M','D'];
					var fragmentArray = [];
					for(var i=0;i<colCombinations.length;i++){
						if(colCombinations[i].combi == frags[fragCount]){
							fragmentArray.push(colCombinations[i].name);
							var monthBeforeDay = colCombinations[i].monthBeforeDay;
							fragCount++;
							i=-1;
							if(fragCount == 3){
								// We have a year, month and day
								log("Year, month and day.");
								/*
								 * Create a new column with the combined date fragments,
								 * then type it as a date within Refine.
								 * 
								 * Need to pass the...
								 * 
								 * TODO
								 */
								self.createNewColumn(fragmentArray,monthBeforeDay,function(newColName,mb4d){

									// Check order of month and day
									if(mb4d){
										self.typeAsXSDDate(newColName,"toDate(value,false)");
									} else {
										self.typeAsXSDDate(newColName,"toDate(value,true)");
									}									
								});

								// Break
								i=colCombinations.length;
							}
						}
					}							
				} else {
					/*
					 * Check for a simple hours, minutes, seconds combination
					 */
					var fragCount=0;
					var frags = ['h','m','s'];
					var fragmentArray = [];
					for(var i=0;i<colCombinations.length;i++){
						if(colCombinations[i].combi == frags[fragCount]){
							fragmentArray.push(colCombinations[i].name);
							fragCount++;
							i=-1;
							if(fragCount == 3){
								// We have hours, minutes and seconds
								log("Hours, minutes and seconds!");
								/*
								 * Create a new column with the combined date fragments,
								 * then type it as a date within Refine.
								 */
								self.createNewColumn(fragmentArray,monthBeforeDay,function(newColName,mb4d){

									// Check order of month and day
									if(mb4d){
										self.typeAsXSDDate(newColName,"toDate(value,false)");
									} else {
										self.typeAsXSDDate(newColName,"toDate(value,true)");
									}									
								});
								// Break
								i=colCombinations.length;
							}
						}
					}
				}

			} else if(colCombinations.length == 6){

				/*
				 * Check for a full house
				 */
				var fragCount=0;
				var frags = ['Y','M','D','h','m','s'];
				var fragmentArray = [];
				for(var i=0;i<colCombinations.length;i++){
					if(colCombinations[i].combi == frags[fragCount]){
						fragmentArray.push(colCombinations[i].name);
						fragCount++;
						i=-1;
						if(fragCount == 3){
							// We have years, months, days, hours, minutes and seconds
							//log("Year, month, day, hours, minutes and seconds!");
							/*
							 * Create a new column with the combined date fragments,
							 * then type it as a date within Refine.
							 */
							self.createNewColumn(fragmentArray,monthBeforeDay,function(newColName,mb4d){

								// Check order of month and day
								if(mb4d){
									self.typeAsXSDDate(newColName,"toDate(value,false)");
								} else {
									self.typeAsXSDDate(newColName,"toDate(value,true)");
								}									
							});
							// Break
							i=colCombinations.length;
						}
					}
				}				
			} else {

				/*
				 * Otherwise check what we're dealing with
				 */
				for(var i=0; i<colCombinations.length;i++){

					log("colCombinations[i].combi: "+colCombinations[i].combi)

					/*
					 * Any date/time that includes a year, day and month can be 
					 * typed within Refine as a date.
					 */
					switch(colCombinations[i].combi){

					case "s" :
						break;
					case "m" :
						break;
					case "m-s" :
						break;
					case "h" :
						break;
					case "h-m" :
						//Special
						break;
					case "h-m-s" :
						//Special
						//Full time in one column
						//Create new column called Time
						alert("Full time");
						break;
					case "D" :
						break;
					case "D-h" :
						break;
					case "D-h-m" :
						break;
					case "D-h-m-s" :
						break;
					case "M" :
						break;
					case "M-D" :
						// Check order of month and day
						break;
					case "M-D-h-m" :
						// Check order of month and day
						break;
					case "M-D-h-m-s" :
						// Check order of month and day
						break;
					case "Y" :
						break;
					case "Y-M" :
						break;
					case "Y-M-D" :
						// Full date in one column

						// Check order of month and day
						if(colCombinations[i].monthBeforeDay){
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,false)");
						} else {
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,true)");
						}

						break;
					case "Y-M-D-h" :
						// Check order of month and day
						if(colCombinations[i].monthBeforeDay){
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,false)");
						} else {
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,true)");
						}
						break;
					case "Y-M-D-h-m" :
						// Check order of month and day
						if(colCombinations[i].monthBeforeDay){
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,false)");
						} else {
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,true)");
						}
						break;
					case "Y-M-D-h-m-s" :
						// Check order of month and day
						if(colCombinations[i].monthBeforeDay){
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,false)");
						} else {
							self.typeAsXSDDate(colCombinations[i].name,"toDate(value,true)");
						}
						break;
					default:
						//Not a valid date or time.
						alert("Sorry, the date that was selected for the \""+colCombinations[i].combi+"\" column cannot be processed.")
						break;

					}
				}
			}

		},

		/*
		 * createNewColumn
		 * 
		 * Takes an array of columns in the order of 
		 * "Y, M, D, h, m, s" and create a new column 
		 * concatenating those columns in order.
		 */
		createNewColumn:function(cols,monthBeforeDay,callback){

			var self = this;
			var expr = "";
			var newName = "";
			for(var i=0; i<cols.length; i++){
				expr += 'cells["'+cols[i]+'"].value+"-"+';
				newName += cols[i]+"-";
			}
			/*
			 * Remove the 'joining' tail of the expression - ( +"-" ).
			 */
			try {
				expr = expr.substring(0, expr.length - 5);
				newName = newName.substring(0,newName.length-1);
				log(expr);
			} catch (e) {
				log(e);
				log("Error formatting date");
			}

			try{
				Refine.postCoreProcess("add-column", {
					baseColumnName: cols[0],
					expression: expr,
					newColumnName: newName,
					columnInsertIndex: Refine.columnNameToColumnIndex(cols[0])+1,
					onError: "keep-original"
				}, null, {
					modelsChanged: true
				}, {
					onDone:function(){
						callback(newName,monthBeforeDay);
					}
				});
			}catch(e){
				log("Error: dateTimeWizard: createNewColumn()");
				log(e);
				alert("A column already exists with the name "+newName+", \"(LG)\" has been appended to the column name for now.");
				Refine.postCoreProcess("add-column", {
					baseColumnName: cols[0],
					expression: expr,
					newColumnName: newName+" (LG)",
					columnInsertIndex: Refine.columnNameToColumnIndex(cols[0])+1,
					onError: "keep-original"
				}, null, {
					modelsChanged: true
				}, {
					onDone:function(){
						callback(newName,monthBeforeDay);
					}
				});				
			}

		},

		/*
		 * typeAsXSDDate
		 * 
		 * Posts a silent text-transform process call 
		 * (i.e. without a noticeable UI update)
		 */
		typeAsXSDDate:function(colName,expr){

			var self = this;

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "text-transform",
				data:{
					columnName: colName,
					expression: expr,
					repeat: false,
					repeatCount: ""
				},
				success:function(){
					Refine.update({cellsChanged:true},function(){
						self.saveRDF(colName);
					});
				},
				error:function(){
					self.onFail("A problem was encountered when performing a text transform on the column: \""+colName+"\".");
				}
			});	

			return false;

		},

		/*
		 * Saves the finialised date format in RDF.
		 */
		saveRDF:function(colName){

			//Add typed class to column header
			var self = this;

			var dcURI = "http://purl.org/dc/terms/";
			var dcCURIE = "dc";
			var xsdURI = "http://www.w3.org/2001/XMLSchema#";
			var xsdCURIE = "xsd";
			var timeURI = "http://www.w3.org/2006/time#";
			var timeCURIE = "time";

			var schema = LinkedGov.getRDFSchema();

			/*
			 * Remove any existing "date" prefixes
			 */
			for(var i=0;i<schema.prefixes.length;i++){
				if(schema.prefixes[i].name == dcCURIE || schema.prefixes[i].name == xsdCURIE || schema.prefixes[i].name == timeCURIE){
					log("Found existing date RDF prefixes, removing...");
					schema.prefixes.splice(i,1);
					i--;
				}
			}

			/*
			 * Remove any existing "address" rootNodes
			 */
			for(var i=0;i<schema.rootNodes.length;i++){
				if(schema.rootNodes[i].id == "date-"+colName){
					log("Found existing date RDF mappings for column: "+colName+", removing...");
					schema.rootNodes.splice(i,1);
					i--;
				}
			}

			schema.prefixes.push({
				"name":dcCURIE,
				"uri":dcURI
			});
			schema.prefixes.push({
				"name":xsdCURIE,
				"uri":xsdURI
			});
			schema.prefixes.push({
				"name":timeCURIE,
				"uri":timeURI
			});

			schema.rootNodes.push({
				"id":"date-"+colName,
				"nodeType":"cell-as-resource",
				"expression":"value",
				"isRowNumberCell":true,
				"rdfTypes":[

				            ],
				            "links":[
				                     {
				                    	 "uri":"http://purl.org/dc/terms/date",
				                    	 "curie":"dc:date",
				                    	 "target":{
				                    		 "nodeType":"cell-as-resource",
				                    		 "expression":"value+\"#date\"",
				                    		 "isRowNumberCell":true,
				                    		 "rdfTypes":[
				                    		             {
				                    		            	 "uri":"http://www.w3.org/2006/time#Instant",
				                    		            	 "curie":"time:Instant"
				                    		             }
				                    		             ],
				                    		             "links":[
				                    		                      {
				                    		                    	  "uri":"http://www.w3.org/2006/time#inXSDDateTime",
				                    		                    	  "curie":"time:inXSDDateTime",
				                    		                    	  "target":{
				                    		                    		  "nodeType":"cell-as-literal",
				                    		                    		  "expression":"value",
				                    		                    		  "valueType":"http://www.w3.org/2001/XMLSchema#dateTime",
				                    		                    		  "columnName":colName,
				                    		                    		  "isRowNumberCell":false
				                    		                    	  }
				                    		                      }
				                    		                      ]
				                    	 }
				                     }
				                     ]
			});

			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(schema)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					//theProject.overlayModels.rdfSchema = schema;
					self.onComplete();
				}
			});


			self.onComplete();
		},

		/*
		 * Returns the wizard to its original state
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.dateTimeBody);
			LinkedGov.showWizardProgress(false);
			LinkedGov.applyTypeIcons.init();
		}

};

/*
 * measurementsWizard
 * 
 * Allows the user to select a column for typing against 
 * a particular measurement.
 * 
 * Once the user has selected a column, they are able to 
 * reconcile what type of measurement it is against the Freebase 
 * database, by typing into an autosuggestion box. The information 
 * returned by the Freebase API lets us store a URI, label and class 
 * for the measurement.
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
		 * elmts: an object that contains the bound HTML elements 
		 * for the measurements wizard panel.
		 */
		vars:{
			elmts:{},
			cols:[]
		},

		/*
		 * The HTML input fields and options for the wizard are passed to 
		 * the wizard object through the parameter "elmts" and are stored 
		 * globally within the wizard.
		 * 
		 * Begins the wizard operation.
		 * 
		 */
		initialise: function(elmts) {
			var self = this;
			self.vars.elmts = elmts;
			self.vars.cols = [];

			LinkedGov.showWizardProgress(true);

			$(elmts.measurementsColumns).find("span.col").each(function() {
				self.vars.cols.push($(this).html());
			});

			self.saveRDF();
		},

		/*
		 * Prepare the returned data from Freebase (measurement URI and label),
		 * and use the columns the user has selected to post an "RDF Schema" object 
		 * to the RDF plugin extension.
		 */
		saveRDF:function(){

			var self = this;
			var elmts = self.vars.elmts;


			/*
			 * E.g. 
			 * 
			 * Returned by API: en/celsius
			 * 
			 * We want,
			 * 
			 * uri = http://rdf.freebase.com/ns/en.celsius
			 * curie = fb:celsius
			 * 
			 */
			var prefix = "fb";
			var namespaceURI = "http://rdf.freebase.com/rdf/";
			var uri = elmts.unitInputField.data("data.suggest").id;

			// Replacing the "/" with a "." in the returned slug for the measurement to 
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

			var cols = self.vars.cols;
			for(var i=0;i<cols.length;i++){

				for(var j=0;j<schema.rootNodes.length;j++){
					if(schema.rootNodes[j].id == "measurements-"+cols[i]){
						schema.rootNodes.splice(j,1);
						j--;
					}
				}
				for(var j=0;j<schema.prefixes.length;j++){
					if(schema.prefixes[j].name == prefix){
						schema.prefixes.splice(j,1);
						j--;
					}
				}			

				schema.prefixes.push({
					"name": prefix,
					"uri": namespaceURI
				});
				schema.rootNodes.push({
					"id":"measurements-"+cols[i],
					"nodeType": "cell-as-resource",
					"expression": "value",
					"isRowNumberCell": true,
					"rdfTypes": [],
					"links": [{
						"uri": uri,
						"curie": curie,
						"target": {
							"nodeType": "cell-as-literal",
							"expression": "value",
							"valueType": "http://www.w3.org/2001/XMLSchema#int",
							"columnName": cols[i],
							"isRowNumberCell": false
						}
					}]
				});

				/*
				 * Save the RDF
				 */
				Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
					schema: JSON.stringify(schema)
				}, {}, {
					onDone: function () {
						//DialogSystem.dismissUntil(self._level - 1);
						//theProject.overlayModels.rdfSchema = schema;
						self.onComplete();
					}
				});

			}

		},


		onFail:function(message){
			alert("Measurments wizard failed.\n\n"+message);
		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.measurementsBody);
			LinkedGov.showWizardProgress(false);
			LinkedGov.applyTypeIcons.init();
		}

};

/*
 * addressWizard
 * 
 * The address wizard helps to clean up addresses, with 
 * the postcode being the highest priority.
 * 
 * A user is able to select one column containing a full address, 
 * in which case, a regular expression is used to separate the 
 * different parts of the address into separate columns, so types 
 * can be applied to those columns.
 * 
 * The user is also able to select multiple columns that contain 
 * fragments of an address, in which case typing is applied to the 
 * columns.
 * 
 * initialise 
 * 
 * getFragments
 * 
 * checkPostCode
 * 
 * makeOSPCFragment
 * 
 * makeVCardFragment
 * 
 * saveRDF
 * 
 * 
 */
LinkedGov.addressWizard = {

		/*
		 * Regex obtained from Wikipedia:
		 * http://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Validation
		 * 
		 * Modified to account for a space in the middle of postcodes:
		 * "Z]?{0" to "Z]? {0".
		 */
		vars: {
			elmts:{},
			postCodeRegex:"[A-Z]{1,2}[0-9R][0-9A-Z]? {0,1}[0-9][ABD-HJLNP-UW-Z]{2}",
			fragmentsToColumns:[]
		},

		/*
		 * 
		 */
		initialise: function(elmts){

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			/*
			 * Build the fragment/column array and check if a 
			 * postcode has been selected, in which case perform 
			 * a regex match to verify.
			 */
			self.vars.fragmentsToColumns = self.getFragments();

			//log('self.vars.fragmentsToColumns:');
			//log(self.vars.fragmentsToColumns);

			var postcodePresent = 0;

			for(var i=0;i<self.vars.fragmentsToColumns.length;i++){
				//log(self.vars.fragmentsToColumns[i]);
				if(self.vars.fragmentsToColumns[i].type == "postcode"){
					postcodePresent = i;
				} else if(self.vars.fragmentsToColumns[i].type == "mixed") {
					checkForPostCode = true;
				}
			}
			
			

			if(postcodePresent > 0){
				self.validatePostCode(self.vars.fragmentsToColumns[postcodePresent].name,function(){
					self.saveRDF();
				});
			}else {
				self.saveRDF();				
			}

		},

		/*
		 * getFragments
		 * 
		 * Creates an array of fragment/column name objects.
		 */
		getFragments:function(){

			log("getFragments");

			var self = this;
			var array = [];

			/*
			 * If there are columns that have been selected
			 */
			if($(self.vars.elmts.addressColumns).children("li").length > 0){
				$(self.vars.elmts.addressColumns).children("li").each(function(){
					var el = $(this);
					/*
					 * Skip any columns that have been removed
					 */
					if(!$(this).hasClass("skip")){
						array.push({
							type:el.find("select").val(),
							name:el.find("span.col").html()
						});
					}
				});

				return array;
			} else {
				return array;
			}
		},


		/*
		 * checkPostCode
		 * 
		 * Asks the user for a new column name (to name the column with the newly 
		 * extracted postcode) and creates a new column based on extracting the 
		 * postcode from the column the user has selected.
		 * 
		 */
		validatePostCode: function(postCodeCol,callback){

			//log("validatePostCode");
			//log("postCodeCol:");
			//log(postCodeCol);

			var self = this;
			var elmts = self.vars.elmts;

			/*
			 * The expression ends with "[1]" so we grab the middle element
			 * (the postcode value) of the returned 3-part regex result.
			 */
			Refine.postCoreProcess("add-column", {
				baseColumnName: postCodeCol,
				expression: "partition(value,/"+self.vars.postCodeRegex+"/)[1]",
				newColumnName: postCodeCol+" LG",
				columnInsertIndex: Refine.columnNameToColumnIndex(postCodeCol)+1,
				onError: "keep-original"
			}, null, {
				modelsChanged: true
			}, {
				onDone:function(){

					// Remove the old postcode column
					LinkedGov.silentProcessCall({
						type:"POST",
						url:"/command/" + "core" + "/" + "remove-column",
						data:{
							columnName: postCodeCol
						},
						success:function(){

							// Rename new column to old column name
							LinkedGov.silentProcessCall({
								type:"POST",
								url:"/command/" + "core" + "/" + "rename-column",
								data:{
									oldColumnName: postCodeCol+" LG",
									newColumnName: postCodeCol
								},
								success:callback,
								error:function(){
									self.onFail("A problem was encountered when renaming the column: \""+postCodeCol+" LG\".");
								}
							});	
						},
						error:function(){
							self.onFail("A problem was encountered when removing the column: \""+postCodeCol+"\".");
						}
					});	

				}
			});	

		},

		/*
		 * saveRDF
		 * 
		 * Figures out what address fragments there are to save and saves them.
		 * 
		 * The passed 'fragments' object should be in the form of key-value pairs, 
		 * key = address fragment type
		 * value = column name
		 * 
		 * E.g. {type:street-address,name:col1},{type:city,name:col3}
		 */
		saveRDF: function(){

			log("saveRDF");

			var self = this;
			var elmts = this.vars.elmts;

			var fragments = self.vars.fragmentsToColumns;
			var schemaFragmentArray = [];

			/*
			 * Store the URIs & namespaces
			 */
			var rdfsURI = "http://www.w3.org/2000/01/rdf-schema#";
			var rdfsCURIE = "rdfs";
			var vcardURI = "http://www.w3.org/2006/vcard/ns#";
			var vcardCURIE = "vcard";
			var ospcURI = "http://data.ordnancesurvey.co.uk/ontology/postcode/";
			var ospcCURIE = "ospc";
			var ospcResourceURI = "http://data.ordnancesurvey.co.uk/id/postcodeunit/";

			var uri, curie = "";

			//log("fragments:");
			//log(fragments);

			/*
			 * Loop through the fragments, the type value can be:
			 * 
			 * - postcode (make an OSPC RDF fragment)
			 * - street-address
			 * - extended-address
			 * - postal-code
			 * - locality
			 * - country-name
			 */
			for(var i=0,len=fragments.length;i<len;i++){

				switch(fragments[i].type){
				case "postcode" :
					/*
					 * Create the vCard postcode RDF
					 */
					uri = vcardURI+fragments[i].type;
					curie = vcardCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeVCardFragment(fragments[i].name,uri,curie));
					/*
					 * Create the OSPC postcode RDF
					 */
					uri = ospcURI+fragments[i].type;
					curie = ospcCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeOSPCFragment(fragments[i].name,uri,curie,ospcResourceURI));
					break;
				default : 
					/*
					 * Create the other vCard address fragments
					 */
					uri = vcardURI+fragments[i].type;
				curie = vcardCURIE+":"+fragments[i].type;
				schemaFragmentArray.push(self.makeVCardFragment(fragments[i].name,uri,curie));
				break;
				}

			}

			/*
			 * The RDF plugin's schema object that's posted to the save-rdf-schema 
			 * process.
			 * 
			 * Note the substition of the schemaFragmentArray variable as the last 
			 * links value for the vCard Address.
			 * 
			 * This object declares that :
			 * - every row in the dataset is a vCard
			 * - every vCard has an address
			 * - every address has whatever address fragments the user has said 
			 * exist in their data.
			 * - postcodes are stored using the OSPC description, given a resolvable 
			 * URI and an rdfs:label.
			 */

			var schema = LinkedGov.getRDFSchema();

			/*
			 * Remove any existing "address" prefixes
			 */
			for(var i=0;i<schema.prefixes.length;i++){
				if(schema.prefixes[i].name == rdfsCURIE || schema.prefixes[i].name == vcardCURIE || schema.prefixes[i].name == ospcCURIE){
					log("Found existing address RDF prefixes, removing...");
					schema.prefixes.splice(i,1);
					i--;
				}
			}

			/*
			 * Remove any existing "address" rootNodes
			 */
			for(var i=0;i<schema.rootNodes.length;i++){
				if(schema.rootNodes[i].id == "address"){
					log("Found existing address RDF mappings, removing...");
					schema.rootNodes.splice(i,1);
					i--;
				}
			}

			schema.prefixes.push({
				"name":rdfsCURIE,
				"uri":rdfsURI
			});
			schema.prefixes.push({
				"name":vcardCURIE,
				"uri":vcardURI
			});
			schema.prefixes.push({
				"name":ospcCURIE,
				"uri":ospcURI
			});

			schema.rootNodes.push({
				"id":"address",
				"nodeType":"cell-as-resource",
				"expression":"value",
				"isRowNumberCell":true,
				"rdfTypes":[{
					"uri":"http://www.w3.org/2006/vcard/ns#VCard",
					"curie":"vcard:VCard"
				}],
				"links":[{
					"uri":"http://www.w3.org/2006/vcard/ns#adr",
					"curie":"vcard:adr",
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"value+\"#address\"",
						"isRowNumberCell":true,
						"rdfTypes":[{
							"uri":"http://www.w3.org/2006/vcard/ns#Address",
							"curie":"vcard:Address"
						}],
						"links":schemaFragmentArray
					}
				}]
			});

			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(schema)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					//theProject.overlayModels.rdfSchema = schema;
					self.onComplete();
				}
			});

		},

		/*
		 * Returns part of the RDF plugin's schema
		 * for a fragment of a vCard address.
		 */
		makeVCardFragment:function(colName,uri,curie){
			var o = {
					"uri":uri,
					"curie":curie,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value",
						"columnName":colName,
						"isRowNumberCell":false
					}
			}

			return o;
		},

		/*
		 * Returns part of the RDF plugin's schema
		 * for a postcode using the OSPC ontology.
		 * 
		 *  It has two levels to the object as we also give the postcode
		 *  a label.
		 */
		makeOSPCFragment:function(colName,uri,curie,pcodeURI){

			var o = {
					"uri":uri,
					"curie":curie,
					"target":{
						"nodeType":"cell-as-resource",
						"expression":"\""+pcodeURI+"\"+value.replace(\" \",\"\")",
						"columnName":colName,
						"isRowNumberCell":false,
						"rdfTypes":[

						            ],
						            "links":[{
						            	"uri":"http://www.w3.org/2000/01/rdf-schema#label",
						            	"curie":"rdfs:label",
						            	"target":{
						            		"nodeType":"cell-as-literal",
						            		"expression":"value",
						            		"columnName":colName,
						            		"isRowNumberCell":false
						            	}
						            }]
					}
			};

			return o;
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
			Refine.update({modelsChanged:true},function(){
				LinkedGov.showWizardProgress(false);
				LinkedGov.applyTypeIcons.init();				
			});
		}
};



/*
 * latLongWizard
 * 
 * The address wizard helps to clean up addresses, with 
 * the postcode being the highest priority.
 * 
 * A user is able to select one column containing a full address, 
 * in which case, a regular expression is used to separate the 
 * different parts of the address into separate columns, so types 
 * can be applied to those columns.
 * 
 * The user is also able to select multiple columns that contain 
 * fragments of an address, in which case typing is applied to the 
 * columns.
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


		vars: {
			elmts:{},
			fragmentsToColumns:[]
		},

		/*
		 * 
		 */
		initialise: function(elmts){

			LinkedGov.showWizardProgress(true);

			var self = this;
			self.vars.elmts = elmts;

			/*
			 * Build the fragment/column array and check if a 
			 * postcode has been selected, in which case perform 
			 * a regex match to verify.
			 */
			self.vars.fragmentsToColumns = self.getFragments();

			log('self.vars.fragmentsToColumns:');
			log(self.vars.fragmentsToColumns);

			self.saveRDF();

		},

		/*
		 * getFragments
		 * 
		 * Creates an array of fragment/column name objects.
		 */
		getFragments:function(){

			log("getFragments");

			var self = this;
			var array = [];

			/*
			 * If there are columns that have been selected
			 */
			if($(self.vars.elmts.latLongColumns).children("li").length > 0){
				$(self.vars.elmts.latLongColumns).children("li").each(function(){
					var el = $(this);
					/*
					 * Skip any columns that have been removed
					 */
					if(!$(this).hasClass("skip")){
						array.push({
							type:el.find("select").val(),
							name:el.find("span.col").html()
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
		 */
		saveRDF: function(){

			log("saveRDF");

			var self = this;
			var elmts = this.vars.elmts;

			var fragments = self.vars.fragmentsToColumns;
			var schemaFragmentArray = [];

			/*
			 * Store the URIs & namespaces
			 */
			var geoURI = "http://www.w3.org/2003/01/geo/wgs84_pos#";
			var geoCURIE = "geo";

			var spatialrelationsURI = "http://data.ordnancesurvey.co.uk/ontology/spatialrelations/";
			var spatialrelationsCURIE = "spatialrelations";
			var uri, curie = "";

			//log("fragments:");
			//log(fragments);

			/*
			 * Loop through the fragments, the type value can be:
			 * 
			 * - postcode (make an OSPC RDF fragment)
			 * - street-address
			 * - extended-address
			 * - postal-code
			 * - locality
			 * - country-name
			 */
			for(var i=0,len=fragments.length;i<len;i++){

				switch(fragments[i].type){
				case "long" :
					/*
					 * Create the longitude RDF
					 */
					uri = geoURI+fragments[i].type;
					curie = geoCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeFragmentRDF(fragments[i].name,uri,curie));

					break;
				case "lat" : 
					/*
					 * Create the latitude RDF
					 */
					uri = geoURI+fragments[i].type;
					curie = geoCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeFragmentRDF(fragments[i].name,uri,curie));

					break;
				case "northing" :
					/*
					 * Create the northing RDF
					 */
					uri = spatialrelationsURI+fragments[i].type;
					curie = spatialrelationsCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeFragmentRDF(fragments[i].name,uri,curie));

					break;
				case "easting" : 
					/*
					 * Create the easting RDF
					 */
					uri = spatialrelationsURI+fragments[i].type;
					curie = spatialrelationsCURIE+":"+fragments[i].type;
					schemaFragmentArray.push(self.makeFragmentRDF(fragments[i].name,uri,curie));

					break;	
				default:
					break;
				}


			}

			var geoURI = "http://www.w3.org/2003/01/geo/wgs84_pos#";
			var geoCURIE = "geo";

			var spatialrelationsURI = "http://data.ordnancesurvey.co.uk/ontology/spatialrelations/";
			var spatialrelationsCURIE = "spatialrelations";


			/*
			 * The RDF plugin's schema object that's posted to the save-rdf-schema 
			 * process.
			 * 
			 * Note the substition of the schemaFragmentArray variable as the last 
			 * links value for the vCard Address.
			 * 
			 * This object declares that :
			 * - every row in the dataset has a geo:point
			 * - the point has a latitude, longitude, northing or easting
			 * 
			 * TODO: Base URI needs to be dynamic.
			 * TODO: Other URIs should be dynamic.
			 */

			var schema = LinkedGov.getRDFSchema();

			for(var i=0;i<schema.rootNodes.length;i++){
				if(schema.rootNodes[i].id == "lat-long"){
					//log("Found existing lat-long RDF mappings, removing...");
					schema.rootNodes.splice(i,1);
					i--;
				}
			}
			for(var i=0;i<schema.prefixes.length;i++){
				if(schema.prefixes[i].name == geoCURIE || schema.prefixes[i].name == spatialrelationsCURIE){
					//log("Found existing lat-long RDF prefixes, removing...");
					schema.prefixes.splice(i,1);
					i--;
				}
			}			

			schema.prefixes.push({
				name:geoCURIE,
				uri:geoURI
			});
			schema.prefixes.push({
				name:spatialrelationsCURIE,
				uri:spatialrelationsURI
			});			
			schema.rootNodes.push({
				"id":"lat-long",
				"nodeType":"cell-as-resource",
				"expression":"value+\"#point\"",
				"isRowNumberCell":true,
				"rdfTypes":[{
					"uri":"http://www.w3.org/2003/01/geo/wgs84_pos#Point",
					"curie":"geo:Point"
				}],
				"links":schemaFragmentArray
			});


			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(schema)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					//theProject.overlayModels.rdfSchema = schema;
					self.onComplete();
				}
			});

		},

		/*
		 * Returns part of the RDF plugin's schema
		 * for a fragment of a vCard address.
		 */
		makeFragmentRDF:function(colName,uri,curie){

			var o = {
					"uri":uri,
					"curie":curie,
					"target":{
						"nodeType":"cell-as-literal",
						"expression":"value",
						"columnName":colName,
						"isRowNumberCell":false
					}
			};


			return o;
		},


		/*
		 * Return the wizard to its original state.
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.latLongBody);
			//Add typed class to column headers
			LinkedGov.showWizardProgress(false);
			LinkedGov.applyTypeIcons.init();
		}
};

LinkedGov.splitVariablePartColumn = {

		vars:{
			colName:"",
			separator:"",
			callback:{},
			lowestNumberOfParts:0
		},

		initialise:function(colName,separator,callback){
			var self = this;
			self.vars.colName = colName;
			self.vars.separator = separator;
			self.vars.callback = callback;

			self.findLowestNumberOfParts();
		},

		findLowestNumberOfParts:function(){

			var self = this;
			// Create custom text facet

			/*
			 * Build a parameter object using the first of the column
			 * names.
			 */
			var facetParams = {
					"facets":[
					          {"type":"list",
					        	  "name":self.vars.colName,
					        	  "columnName":self.vars.colName,
					        	  "expression":"value.split(\""+self.vars.separator+"\").length()",
					        	  "omitBlank":false,
					        	  "omitError":false,
					        	  "selection":[],
					        	  "selectBlank":false,
					        	  "selectError":false,
					        	  "invert":false
					          }
					          ],
					          "mode":"row-based"
			};

			/*
			 * Post a silent facet call.
			 */
			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "compute-facets",
				data:{
					engine: JSON.stringify(facetParams)
				},
				success:function(data) {
					/*
					 * Loop through the UI facets
					 */
					log("data.facets.length = "+data.facets.length);
					for(var i=0; i<data.facets.length; i++){
						log("i="+i);
						/*
						 * If the facet matches the column name and has choices returned
						 */
						if(data.facets[i].columnName == self.vars.colName && typeof data.facets[i].choices != 'undefined'){
							log("Facet data received successfully");
							/*
							 * Store the lowest number of parts
							 */
							var temp = 9999999;
							for(var h=0; h<data.facets[i].choices.length;h++){
								if(data.facets[i].choices[h].v.v < temp){
									temp = data.facets[i].choices[h].v.v;
								}
							}
							self.vars.lowestNumberOfParts = temp;

							log("Lowest number of parts for column "+self.vars.colName+": "+temp);
						}
					}

					if(temp < 2){
						self.onFail("This split will have no effect as there are single-part values in this column.");
					} else {
						self.createNewColumns(1, self.vars.lowestNumberOfParts-1);
					}

				},
				error:function(){
					self.onFail("A problem was encountered when computing facets.");
				}
			});

		},

		/*
		 * createNewColumns
		 * 
		 * Recursive function that creates the new columns after splitting
		 * the selected address column.
		 * 
		 * Takes 2 parameters. "partIndex" is the index used to grab 
		 * the particular part of the split array, i.e. value.split(",")[partIndex].
		 * colSuffix is the number used to append to the name of the column 
		 * when creating the new columns.
		 *
		 */
		createNewColumns:function(partIndex, colSuffix){

			log("createNewColumns");

			var self = this;
			// Add new columns for value parts depending on the 
			// the lowest number of parts

			if(partIndex < self.vars.lowestNumberOfParts && colSuffix > 0){

				try{
					Refine.postCoreProcess("add-column", {
						baseColumnName: self.vars.colName,
						expression: 'value.split("'+self.vars.separator+'")[value.split("'+self.vars.separator+'").length()-'+partIndex+'].trim()',
						newColumnName: self.vars.colName+" "+colSuffix,
						columnInsertIndex: Refine.columnNameToColumnIndex(self.vars.colName)+1,
						onError: "keep-original"
					}, null, {
						modelsChanged: true
					}, {
						onDone:function(){
							self.createNewColumns(partIndex, colSuffix);
						}
					});
				}catch(e){
					log("Error: splitVariablePartColumn - createNewColumns()")
					log(e);
					alert("A column already exists with the name "+self.vars.colName+" "+colSuffix+", \"(LG)\" has been appended to the column name for now.");
					/*
					 * If the error is due to the new column name already existing 
					 * then append a more unique suffix
					 */
					Refine.postCoreProcess("add-column", {
						baseColumnName: self.vars.colName,
						expression: 'value.split("'+self.vars.separator+'")[value.split("'+self.vars.separator+'").length()-'+partIndex+'].trim()',
						newColumnName: self.vars.colName+" "+colSuffix+" (LG)",
						columnInsertIndex: Refine.columnNameToColumnIndex(self.vars.colName)+1,
						onError: "keep-original"
					}, null, {
						modelsChanged: true
					}, {
						onDone:function(){
							self.createNewColumns(partIndex, colSuffix);
						}
					});
				}

				partIndex++;
				colSuffix--
			} else {
				self.partitionForLastPart();
			}

		},

		partitionForLastPart:function(){

			log("partitionForLastPart");

			// Finally, perform a text transform on the selected column using 
			// the GREL partition function, leaving us with any values upto  
			// the last value we created a new colum for.
			var self = this;

			LinkedGov.silentProcessCall({
				type:"POST",
				url:"/command/" + "core" + "/" + "text-transform",
				data:{
					columnName: self.vars.colName, 
					expression: 'partition(value,"'+self.vars.separator+'"+value.split("'+self.vars.separator+'")[value.split("'+self.vars.separator+'").length()-2])[0].trim()', 
					onError: "keep-original",
					repeat: false,
					repeatCount: 10
				},
				success:function(){
					self.onComplete();
				},
				error:function(){
					self.onFail("A problem was encountered when performing a text-transform on the column: \""+self.vars.colName+"\".");
				}
			});


		},

		onFail:function(message){
			alert("Column split failed.\n\n"+message);
			self.vars.callback();
		},

		/*
		 * onComplete
		 */
		onComplete:function(){
			var self = this;

			Refine.update({cellsChanged:true},function(){
				LinkedGov.applyTypeIcons.init();
				self.vars.callback();
			});

		}

};

/*
 * 
 */
LinkedGov.applyTypeIcons = {

		/*
		 * Uses data stored in the RDF schema object to apply the RDF symbols 
		 * to columns that have RDF data.
		 */
		init:function(){

			//log("Applying type icons...");

			var self = this;
			if(typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined' && $("td.column-header").length > 0){				
				$.each(theProject.overlayModels.rdfSchema, function(key, val) { 
					self.recursiveFunction(key, val);
				});	
			} else {
				var t = setInterval(function(){
					if($("td.column-header").length > 0 && typeof theProject.overlayModels != 'undefined' && typeof theProject.overlayModels.rdfSchema != 'undefined'){
						clearInterval(t);
						$.each(theProject.overlayModels.rdfSchema, function(key, val) { 
							self.recursiveFunction(key, val) 
						});
					}
				},100);		
			}
		},

		recursiveFunction: function(key, val) {
			var self = this;
			self.actualFunction(key, val);
			if (val instanceof Object) {
				$.each(val, function(key, value) {
					self.recursiveFunction(key, value)
				});
			}
		},

		actualFunction: function(key,val){
			if(key == "columnName"){
				$("td.column-header").each(function(){
					if($(this).find("span.column-header-name").html() == val){
						$(this).addClass("typed");
					}
				});	
			}
		}

};


/*
 * DOM.loadHTML
 * 
 * An overriding function that allows a callback function
 * to be called on the success of any HTML injection.
 * 
 * Overriding the main DOM.loadHTML function allows us to inject 
 * our own JS whenever Refine injects HTML.
 */
DOM.loadHTML = function(module, path, callback) {

	callback = callback || function(){};

	if(path == ""){
		module = "linkedgov";
		path = "";
	}
	var fullPath = ModuleWirings[module] + path;
	if (!(fullPath in DOM._loadedHTML)) {
		$.ajax({
			async: false,
			url: fullPath,
			dataType: "html",
			success: function(html) {
				DOM._loadedHTML[fullPath] = html;
				LinkedGov.loadHTMLCallback(fullPath);
				callback();
			}
		});
	} else {
		callback();
	}
	return DOM._loadedHTML[fullPath];
};


function log(str) {
	window.console && console.log && LinkedGov.vars.debug && console.log(str);
}

/*
 * Initialise our code once the page has fully loaded.
 */
$(document).ready(function(){
	LinkedGov.initialise();
});