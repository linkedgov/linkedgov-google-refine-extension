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
 * using the minimal AJAX $.post() function, which doesn't carry with it 
 * any of Refine's UI update functions. This replacement has to be used 
 * carefully though as some operations rely on previous updates being 
 * made (i.e. row-removals and row/column transposes require the 
 * data-table to be updated otherwise successive operations will fail 
 * to realise the old rows/columns have been changed).
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
			blanksSetToNulls:false
		},

		/*
		 * initialise
		 * 
		 * Initial styling and injections
		 */
		initialise: function() {
			this.restyle();
			this.injectTypingPanel();
			//this.quickTools();
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
				if($(this).hasClass("show")){
					$(this).find(".quick-tool").hide();
					$(this).addClass("hide").removeClass("show");
				}else if($(this).hasClass("hide")){
					$(this).find(".quick-tool").show();
					$(this).addClass("show").removeClass("hide");
				}else{
					if(!$("table.data-table").hasClass("ui-selectable")){

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
					var name = window.prompt("Name:","");
					LinkedGov.renameColumn(colName,name,function(){
						Refine.update({modelsChanged:true});
					});
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
		 * restyle
		 * 
		 * Any major initial restyling
		 */
		restyle: function() {
			/*
			 * Giving the body our own class applies our CSS rules.
			 */
			$("body").addClass("lg");
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
			 *  Use this CSS instead of a JS resize:
			 *  bottom: 0;
    			height: auto !important;
    			top: 28px;
			 */
			ui.typingPanel.resize(); 
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
			$.post(
					"/command/core/set-preference",
					{
						name : "ui.browsing.listFacet.limit",
						value : n
					},
					function(o) {
						if (o.code == "ok") {
							ui.browsingEngine.update();
						} else if (o.code == "error") {
							alert(o.message);
						}
					},
					"json"
			);			
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
				$.post(
						"/command/" + "core" + "/" + "text-transform" + "?" + $.param({
							columnName: columns[i].name, 
							expression: expr, 
							onError: "keep-original",
							repeat: false,
							repeatCount: 10,
							project:theProject.id
						}),
						null,
						function(){
							i = i+1;
							self.setBlanksToNulls(toNulls,columns,i,callback);
						},
						"json"
				);

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
			$.post(
					"/command/" + "core" + "/" + "rename-column" + "?" + $.param({
						oldColumnName: oldName,
						newColumnName: newName,
						project: theProject.id
					}),
					null,
					callback(),
					"json"
			);
		},

		/*
		 * Removes a column
		 */
		removeColumn:function(colName,callback){
			$.post(
					"/command/" + "core" + "/" + "remove-column" + "?" + $.param({
						columnName: colName,
						project: theProject.id
					}),
					null,
					callback,
					"json"
			);
		},

		/*
		 * Split a column
		 */
		splitColumn:function(colName,separator,callback){
			
			var config = {
					columnName: colName,
					mode: "separator",
					separator: separator,
					guessCellType: true,
					removeOriginalColumn: true,
					regex:false,
					project:theProject.id
			};
			
			$.post(
					"/command/" + "core" + "/" + "split-column" + "?" + $.param(config),
					null,
					function(){
						Refine.update({modelsChanged:true},function(){
							callback();	
						});
					},
					"json"
			);
		},
		
		/*
		 * Moves a column left or right
		 */
		moveColumn:function(colName,dir,callback){

			var i = Refine.columnNameToColumnIndex(colName)+(dir == "left" ? -1 : 1);
			log(i);

			$.post(
					"/command/" + "core" + "/" + "move-column" + "?" + $.param({
						columnName:colName,
						index:i,
						project:theProject.id
					}),
					null,
					callback,
					"json"
			);

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
			$(wizardBody).find("ul.column-display").html("");
			//Clear text fields
			$(wizardBody).find(":text").val("");

			//Make sure the wizard is displayed so the user can repeat the 
			//task if they wish
			$("a.wizard-header").removeClass("exp");
			$(wizardBody).prev("a.wizard-header").addClass("exp");
			$("div.wizard-body").hide();
			$(wizardBody).show();

			//Display the typing panel
			ui.leftPanelTabs.tabs({ selected: 1 });	

			// Scroll the top of the wizard into view.
			$(wizardBody).parent().scrollTop($(wizardBody).prev("a.wizard-header").offset().top)

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

			log("reorderColumns");

			if(self.vars.colsToSkip.length > 0){

				/*
				 * Post a minimal "move-column" call, moving each skipped 
				 * column to the start of the column range.
				 */
				$.post(
						"/command/" + "core" + "/" + "move-column" + "?" + $.param({
							columnName:self.vars.colsToSkip[0],
							index:colIndex,
							project:theProject.id
						}),
						null,
						function(){
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
						"json"
				);

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

			var config = {
					startColumnName: self.vars.startColName,
					columnCount: self.vars.colCount,
					combinedColumnName: self.vars.newColName,
					prependColumnName: true,
					separator: LinkedGov.vars.separator,
					ignoreBlankCells: true,
					project:theProject.id
			};

			/* 
			 * Instead of using Refine.postCoreProcess(), we post the transpose 
			 * process as a more minimal "AJAX" call without the default UI update 
			 * callbacks.
			 */
			$.post(
					"/command/" + "core" + "/" + "transpose-columns-into-rows" + "?" + $.param(config),
					null,
					function(){
						/*
						 * Perform a minimal UI update before calling the 
						 * next operation.
						 */
						Refine.reinitializeProjectData(function(){
							ui.dataTableView.update(function(){
								ui.browsingEngine.update(self.splitColumns());
							});
						});
					},
					"json"
			);

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

			var config = {
					columnName: self.vars.newColName,
					mode: "separator",
					separator: LinkedGov.vars.separator,
					guessCellType: true,
					removeOriginalColumn: true,
					regex:false,
					project:theProject.id
			};

			/*
			 * Post a minimal "split-column" process call (without the default UI update callbacks).
			 * 
			 * After splitting the columns, the transpose has left us with lots of blank cells 
			 * which need to be filled down.
			 */
			$.post(
					"/command/" + "core" + "/" + "split-column" + "?" + $.param(config),
					null,
					function(){
						Refine.update({modelsChanged:true},function(){
							self.fillDownColumns(theProject.columnModel.columns,0);	
						});
					},
					"json"
			);

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

					$.post(
							"/command/" + "core" + "/" + "fill-down" + "?" + $.param({
								columnName: columns[i].name,
								project:theProject.id
							}),
							null,
							function(){
								i = i+1;
								self.fillDownColumns(columns,i);
							},
							"json"
					);

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
			});

			return false;
		},

		onFail:function(){
			var self = this;
			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				log("Multiple columns wizard failed.");
				Refine.update({everythingChanged:true});
				LinkedGov.resetWizard(self.vars.elmts.multipleColumnsBody);
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
		 * A recursive function that posts a minimal "compute-facet" call to 
		 * retrieve information about the number of unique values in each 
		 * column. The minimal call avoids any facets being created and removed 
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

				/*
				 * Post a minimal call (remembering to include 'theProject' parameter for 
				 * minimal calls).
				 */
				$.post(
						"/command/core/compute-facets?" + $.param({ project: theProject.id }),
						{ engine: JSON.stringify(facetParams) },
						function(data) {

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
									log(data.facets[h].columnName + '==' + self.vars.headersColName);
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
								self.onFail();
							}
						}
				);	

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
			 * Post a minimal "reorder-rows" call - remembering to include the 'theProject' 
			 * parameter.
			 */
			$.post(
					"/command/" + "core" + "/" + "reorder-rows" + "?" + $.param({ 
						sorting : JSON.stringify(sortingObject), 
						project: theProject.id 
					}),
					null,
					function(){
						self.multiValueTranspose();				
					},
					"json"
			);

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

			$.post(
					"/command/core/compute-facets?" + $.param({ project: theProject.id }),
					{ engine: JSON.stringify(facetParams) },
					function(data) {

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
									self.vars.abortMessage = "There are too many values being transposed. The maximum " +
									"number of unique values (or rows) to transpose is 100";					
								}
							}
						}

						/*
						 * If there was an issue with using the facet, abort, otherwise continue.
						 */
						if(!self.vars.abortOperation){
							log("transposing...");
							/*
							 * Post a minimal "transpose" call, performing a minor UI update as a callback,
							 * before proceeding the next operation.
							 */
							$.post(
									"/command/" + "core" + "/" + "transpose-rows-into-columns" + "?" + $.param({
										columnName:self.vars.valuesColName,
										rowCount:self.vars.newHeaders.length,
										project: theProject.id
									}),
									null,
									function(){
										Refine.update({modelsChanged:true},function(){
											self.removeBlankRows();				
										});
									},
									"json"
							);
						} else {
							log("failing...");
							self.onFail();
						}
					},
					"json"
			);					

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
				 * Post a minimal "rename" call
				 */
				$.post(
						"/command/" + "core" + "/" + "rename-column" + "?" + $.param({
							oldColumnName: oldNames[0],
							newColumnName: newNames[0],
							project: theProject.id
						}),
						null,
						function(){
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
						"json"
				);
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
			 * Post a minimal "remove-column" call.
			 */
			$.post(
					"/command/" + "core" + "/" + "remove-column" + "?" + $.param({
						columnName: self.vars.headersColName,
						project: theProject.id
					}),
					null,
					function(){
						self.onComplete();			
					},
					"json"
			);
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
			});

			return false;
		},

		onFail:function(){
			var self = this;
			log("onFail");
			LinkedGov.setBlanksToNulls(false,theProject.columnModel.columns,0,function(){
				alert("Multiple Values wizard failed. \n\n"+self.vars.abortMessage);
				LinkedGov.resetWizard(self.vars.elmts.multipleValuesBody);	
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
		 * Detects whether the user has chosen to clean up 
		 * dates, times or both.
		 * 
		 * Also detects whether the user has said that the clean 
		 * up operation might be more complicated (fragmented values)
		 */
		initialise: function(elmts) {

			log("dateTimeWizard initialising");

			var self = this;
			self.vars.elmts = elmts;

			var checkedDate = $(elmts.dateCheck).attr("checked");
			var checkedTime = $(elmts.timeCheck).attr("checked");

			if(checkedDate || checkedTime){

				if(checkedMoreComplicated){

					// Perform the fragmented* operations.

					// Store the columns to be operated on
					$(elmts.dateColsComplicated).children().each(function(){
						self.vars.columns.push($(this).children("span.col").html());
					});

					if(checkedDate && !checkedTime){
						this.fragmentedDate();					
					} else if(!checkedDate && checkedTime){
						this.fragmentedTime();					
					} else if(checkedDate && checkedTime){
						this.fragmentedDate();
						this.fragmentedTime();
						/*
						 * Join the two date and time columns together to 
						 * produce a proper date-time value.
						 */
					}

				} else {

					// Perform the simple* operations.

					// Store the columns to be operated on
					$(elmts.dateTimeColumns).children().each(function(){
						self.vars.columns.push($(this).children("span.col").html());
					});

					if(checkedDate && !checkedTime){
						this.simpleDate();					
					} else if(!checkedDate && checkedTime){
						this.simpleTime();				
					} else if(checkedDate && checkedTime){
						this.simpleDate();
						this.simpleTime();	
						/*
						 * Join the two date and time columns together to 
						 * produce a proper date-time value.
						 */						
					}				
				}

			} else {
				alert("You need to specify if the columns you have selected contain dates, times or both");
			}

		},

		/*
		 * simpleDate
		 * 
		 * Properly types a column using the value.toDate() expression 
		 * for Refine and produces RDF.
		 */
		simpleDate:function() {

			var self = this;

			var cols = self.vars.columns;

			for(var i=0, len=cols.length; i<len; i++){

				Refine.postCoreProcess("text-transform", {
					columnName: cols[i],
					expression: "value.toDate()",
					repeat: false,
					repeatCount: ""
				}, null, {
					cellsChanged: true
				});

//				http://127.0.0.1:3333/command/rdf-extension/save-rdf-schema?project=1702403439701

//				var rdfSchemaPost = schema = { "prefixes":[ {
//				"name":"rdfs",
//				"uri":"http://www.w3.org/2000/01/rdf-schema#" }, {
//				"name":"foaf", "uri":"http://xmlns.com/foaf/0.1/" }, {
//				"name":"xsd", "uri":"http://www.w3.org/2001/XMLSchema#" }, {
//				"name":"owl", "uri":"http://www.w3.org/2002/07/owl#" }, {
//				"name":"rdf",
//				"uri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#" } ],
//				"baseUri":"http://localhost:3333/", "rootNodes":[ {
//				"nodeType":"cell-as-resource", "expression":"value",
//				"isRowNumberCell":true, "rdfTypes":[
//				], "links":[ {
//				"uri":"http://www.w3.org/2001/XMLSchema#date",
//				"curie":"xsd:date", "target":{
//				"nodeType":"cell-as-literal", "expression":"value.(d)",
//				"columnName":$(this).html(), "isRowNumberCell":false } } ] } ] }

//				&engine={"facets":[],"mode":"row-based"};


			}		
		},

		/*
		 * fragmentedDate
		 * 
		 * Takes a number of columns that contain parts of a date, 
		 * attempts to concatenate them together and applies the 
		 * value.toDate() expression to the combined column. Finally 
		 * it produces RDF.
		 */
		fragmentedDate:function(){

			var self = this;

			/*
			 * Store the "should-be" date fragments in an array, which will 
			 * be in the same order as the columns the user has selected.
			 */
			$(self.vars.elmts.dateColsComplicated).children().each(function(){
				self.vars.colFragments.push($(this).children("select").val());
			});

			/*
			 * Build a GREL expression that concatenates the date parts in the 
			 * correct order.
			 */
			var expression = self.buildExpression();

			var colName = window.prompt("New column name:", theProject.metadata.name);

			/*
			 * Post an "add-column" call, based on the first column the 
			 * user selected, using the expression we've just built, 
			 * the new column name that the user has just entered and inserting 
			 * the new date column just after the columns the user has selected.
			 */
			Refine.postCoreProcess("add-column", {
				baseColumnName: self.vars.columns[0],
				expression: expression,
				newColumnName: colName,
				columnInsertIndex: Refine.columnNameToColumnIndex(self.vars.columns[self.vars.columns.length-1])+1,
				onError: "keep-original"
			}, null, {
				modelsChanged: true
			}, {
				onDone:function(){
					/*
					 * Once we've created the new date column, type the column as an 
					 * ISO date internally within Refine.
					 */
					Refine.postCoreProcess("text-transform", {
						columnName: colName,
						expression: "value.toDate()",
						repeat: false,
						repeatCount: ""
					}, null, {
						cellsChanged: true
					});
				}
			});

		},

		/*
		 * Properly types a timestamp within Refine and produces
		 * RDF.
		 */
		simpleTime:function(){

		},

		/*
		 * Takes a number of columns that contain part of a timestamp 
		 * and concatenates them together using the iterated expression 
		 * builder.
		 */
		fragmentedTime:function(){

		},

		/*
		 * Used in conjunction with fragmented date and time, it 
		 * takes a number of columns and attempts to build a 
		 * concatenation expression for date or time in the correct 
		 * order.
		 * 
		 * E.g. if the columns picked were "Year, Month, Day", the 
		 * expression built would produce a date in the order 
		 * "Day-Month-Year".
		 */
		buildExpression:function(){

			var self = this;
			var expression = "";
			// Set up the order of date parts for the new date
			var dateOrder = ["Year", "Month", "Day", "Hours", "Minutes", "Seconds"];
			// Array of selected columns
			var cols = self.vars.columns;
			// Array of the selected column "should-be" date fragments (from the select inputs)
			var colFragments = self.vars.colFragments;

			/*
			 * Build a GREL expression string that concatenates the columns 
			 * in the correct order, ready to be converted to an ISO date.
			 */
			for (var i=0, len=dateOrder.length; i<len; i++) {
				for(var j=0, len2=colFragments.length; j<len2; j++) {

					log('colFragments[j]:');
					log(colFragments[j]);
					log('dateOrder[i]:');
					log(dateOrder[i]);

					if (colFragments[j] == dateOrder[i]) {
						expression += 'cells["' + cols[j] + '"].value+"-"+';
					}
				}
			}

			/*
			 * Remove the 'joining' tail of the expression - ( +"-" ).
			 */
			try {
				expression = expression.substring(0, expression.length - 5);
				log(expression);
			} catch (e) {
				log(e);
				log("Error formatting date");
			}

			return expression;

		},

		/*
		 * Returns the wizard to its original state
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.dateTimeBody);
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
			elmts:{}
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

			var prefix = "fb";
			var namespaceURI = "http://rdf.freebase.com/ns/";

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
			$(elmts.measurementsColumns).children().each(function () {

				var jsonObj = {
						"prefixes": [{
							"name": prefix,
							"uri": namespaceURI
						}],
						"baseUri": "http://127.0.0.1:3333/",
						"rootNodes": [{
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
									"columnName": $(this).children("span.col").html(),
									"isRowNumberCell": false
								}
							}]
						}]
				};

				/*
				 * Save the RDF
				 */
				Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
					schema: JSON.stringify(jsonObj)
				}, {}, {
					onDone: function () {
						//DialogSystem.dismissUntil(self._level - 1);
						self.onComplete();
						theProject.overlayModels.rdfSchema = jsonObj;
					}
				});

			});

		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.measurementsBody);
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

			for(var i=0;i<self.vars.fragmentsToColumns.length;i++){
				log(self.vars.fragmentsToColumns[i]);
				if(self.vars.fragmentsToColumns[i].type == "postcode"){
					self.checkPostCode(self.vars.fragmentsToColumns[i].name,function(){
						self.saveRDF();
					});
				}
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
		checkPostCode: function(postCodeCol,callback){

			//log("checkPostCode");
			//log("postCodeCol:");
			//log(postCodeCol);

			var self = this;
			var elmts = this.vars.elmts;

			var colName = window.prompt("Enter a new postcode column name:", "");

			/*
			 * The expression ends with "[1]" so we grab the middle element
			 * (the postcode value) of the returned 3-part regex result.
			 */
			Refine.postCoreProcess("add-column", {
				baseColumnName: postCodeCol,
				expression: "partition(value,/"+self.vars.postCodeRegex+"/)[1]",
				newColumnName: colName,
				columnInsertIndex: Refine.columnNameToColumnIndex(postCodeCol)+1,
				onError: "keep-original"
			}, null, {
				modelsChanged: true
			}, {
				onDone:function(){
					/*
					 * Change the "postcode" fragment column to the new 
					 * postcode column as a result of the regex match
					 * 
					 * TODO: This doesn't look like it's working. And the stage
					 * at which the postcode is corrected should be thought about.
					 */
					for(var i=0;i<self.vars.fragmentsToColumns;i++){
						if(fragmentsToColumns[i].type == "postcode"){
							log("fragmentsToColumns[i].name = "+fragmentsToColumns[i].name);
							fragmentsToColumns[i].name = colName;
							log("fragmentsToColumns[i].name = "+fragmentsToColumns[i].name);
						}
					}
					callback();
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
			 * 
			 * TODO: Base URI needs to be dynamic.
			 * TODO: Other URIs should be dynamic.
			 */
			var schemaObj = {
					"prefixes":[{
						"name":"rdfs",
						"uri":"http://www.w3.org/2000/01/rdf-schema#"
					},
					{
						"name":"vcard",
						"uri":"http://www.w3.org/2006/vcard/ns#"
					},
					{
						"name":"ospc",
						"uri":"http://data.ordnancesurvey.co.uk/ontology/postcode/"
					}
					],
					"baseUri":"http://localhost:3333/",
					"rootNodes":[
					             {
					            	 "nodeType":"cell-as-resource",
					            	 "expression":"value",
					            	 "isRowNumberCell":true,
					            	 "rdfTypes":[
					            	             {
					            	            	 "uri":"http://www.w3.org/2006/vcard/ns#VCard",
					            	            	 "curie":"vcard:VCard"
					            	             }
					            	             ],
					            	             "links":[
					            	                      {
					            	                    	  "uri":"http://www.w3.org/2006/vcard/ns#adr",
					            	                    	  "curie":"vcard:adr",
					            	                    	  "target":{
					            	                    		  "nodeType":"cell-as-resource",
					            	                    		  "expression":"value+\"#address\"",
					            	                    		  "isRowNumberCell":true,
					            	                    		  "rdfTypes":[
					            	                    		              {
					            	                    		            	  "uri":"http://www.w3.org/2006/vcard/ns#Address",
					            	                    		            	  "curie":"vcard:Address"
					            	                    		              }
					            	                    		              ],
					            	                    		              "links":schemaFragmentArray
					            	                    	  }
					            	                      }
					            	                      ]
					             }
					             ]
			};

			/*
			 * Save the RDF.
			 */
			Refine.postProcess("rdf-extension", "save-rdf-schema", {}, {
				schema: JSON.stringify(jsonObj)
			}, {}, {
				onDone: function () {
					//DialogSystem.dismissUntil(self._level - 1);
					theProject.overlayModels.rdfSchema = jsonObj;
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
						            "links":[
						                     {
						                    	 "uri":"http://www.w3.org/2000/01/rdf-schema#label",
						                    	 "curie":"rdfs:label",
						                    	 "target":{
						                    		 "nodeType":"cell-as-literal",
						                    		 "expression":"value",
						                    		 "columnName":colName,
						                    		 "isRowNumberCell":false
						                    	 }
						                     }
						                     ]
					}
			}

			return o;
		},

		/*
		 * Return the wizard to its original state.
		 */
		onComplete:function(){
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.addressBody);
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
DOM.loadHTML = function(module, path) {

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
			}
		});
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