/*
 * nullValueWizard
 * 
 * Allows the user to select a column for typing against a particular
 * measurement.
 * 
 * 
 */
var nullValueWizard = {

		/*
		 * elmts: an object that contains the bound HTML elements for the
		 * nullValue wizard panel.
		 */
		vars : {
			elmts : {}
		},

		/*
		 * Builds the column objects and saves their RDF. 
		 */
		initialise : function(elmts) {

			var self = this;
			self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			self.vars.elmts = elmts;

			if (elmts.nullValueInputField.val().length > 0) {

				/*
				 * Display the "working..." sign
				 */
				LinkedGov.showWizardProgress(true);

				/*
				 * Attempt to nullify all missing values
				 */
				self.nullifyValues(elmts.nullValueInputField.val(),0);

			} else {
				alert("You need to enter a \"missing\" value in the text box.");
			}

		},

		/*
		 * nullifyValues
		 * 
		 * Perform a string-replace text-transform on all cells
		 */
		nullifyValues : function(value, index) {

			var self = this;
			var columns = theProject.columnModel.columns;

			if(index < columns.length){

				LinkedGov.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "mass-edit",
					data : {
						columnName : columns[index].name,
						edits : '[{"from":["'+value+'"],"to":""}]',
						expression : 'value',
						engine : {"facets":[],"mode":"row-based"}
					},
					success : function() {
						index = index + 1;
						self.nullifyValues(value,index);
					},
					error : function() {
						self.onFail("A problem was encountered when replacing the values in the column: \""+ columns[index].name + "\".");
					}
				});

			} else {
				self.onComplete();				
			}
		},

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {
			var self = this;
			alert("Null value wizard failed.\n\n" + message);
			LinkedGov.resetWizard(self.vars.elmts.nullValueBody);
			LinkedGov.showWizardProgress(false);
		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete : function() {
			var self = this;
			LinkedGov.resetWizard(self.vars.elmts.nullValueBody);
			LinkedGov.showUndoButton(self.vars.elmts.nullValueBody);
			//LinkedGov.summariseWizardHistoryEntry("Measurements wizard", self.vars.historyRestoreID);
			Refine.update({modelsChanged:true});
			LinkedGov.showWizardProgress(false);
		}

};
