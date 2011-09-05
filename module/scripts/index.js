var LinkedGov = {
		
		_initialise: function() {
			
			this._disableFeatures();
			this._restyle();
			this._injectMetaDataForm();
		},
		
		_restyle: function() {
			$("body").addClass("lg");
			$("#left-panel").hide();
		},
		
		_disableFeatures: function() {

			/*
			 * actionAreas[0] - Create Project
			 * actionAreas[1] - Open Project
			 * actionAreas[2] - Import Project
			 */
			
			// Remove the clipboard source HTML

		},

		_injectMetaDataForm: function() {
			
			$("table#create-project-ui-source-selection-layout").append(
					"<tr>" +
					"<td class='spacer'><button id='dummy'>Dummy text</button></td>" +
					"<td id='linkedgov-metadata-form'><!-- inject --></td>" +
					"</tr>");
			
			this._bodyElmt = $("table tr td#linkedgov-metadata-form");
	
			this._bodyElmt.html(DOM.loadHTML("linkedgov", "html/index/metadata-form.html"));
						
		},
		
		loadHTMLCallback: function(htmlPage) {
			
			//alert(htmlPage+" has been loaded");
			
			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			var pageName = htmlPage.replace(".html","");
			
			switch(pageName) {

			case 'metadata-form' :
				
				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');
				break;
				
			case 'parsing-panel' :
				
				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');
				break;
				
			case 'excel-parser-ui' :
				
				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');										
				break;
				
			case 'parsing-panel' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');				
				break;
				
			case 'separator-based-parser-ui' :

				$.getScript(ModuleWirings["linkedgov"] + 'scripts/index/'+pageName+'.js');		
				break;
				
			default:
				break;
			}

			return false;
		}
};

DOM.loadHTML = function(module, path) {

	if(path == "scripts/index/parser-interfaces/excel-parser-ui.html"){
		module = "linkedgov";
		path = "html/index/excel-parser-ui.html";
	} else if(path == "scripts/index/default-importing-controller/parsing-panel.html"){
		module = "linkedgov";
		path = "html/index/parsing-panel.html";		
	} else if(path == "scripts/index/parser-interfaces/separator-based-parser-ui.html"){
		module = "linkedgov";
		path = "html/index/separator-based-parser-ui.html";		
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
	    })
	  }
	  return DOM._loadedHTML[fullPath];
};

$(document).ready(function(){
		
	LinkedGov._initialise();

});