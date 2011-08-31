/*
 * Copyright 2011
 * LinkedGov
 * Author: Dan Smith
 * 
 */
// This file is added to the /project page

var LinkedGov = {
		
		_initialise: function() {
			
			this._disableFeatures();
			this._restyle();
			this._injectTypingPanel();
		},
		
		_restyle: function() {
			$("body").addClass("lg");
			//$("#left-panel").hide();
		},
		
		_disableFeatures: function() {

			/*
			 * actionAreas[0] - Create Project
			 * actionAreas[1] - Open Project
			 * actionAreas[2] - Import Project
			 */
			
			// Remove the clipboard source HTML

		},

		_injectTypingPanel: function() {

			
			$(".refine-tabs ul").prepend('<li><a href="#refine-tabs-typing">Typing</a></li>');
			$("div.refine-tabs").append('<div id="refine-tabs-typing" bind="typingPanelDiv"><!-- spacer --></div>');
			$("div#refine-tabs-typing").html(DOM.loadHTML("linkedgov", "html/project/typing-panel.html"));
			
			$.getScript(ModuleWirings["linkedgov"] + 'scripts/project/typing-panel.js');

			
		},
		
		loadHTMLCallback: function(htmlPage) {
			
			//alert(htmlPage+" has been loaded");
			
			htmlPage = htmlPage.split("/");			
			htmlPage = htmlPage[htmlPage.length-1];
			var pageName = htmlPage.replace(".html","");
			
			switch(pageName) {

			case 'typing-panel' :
				
				break;
				
			default:
				break;
			}

			return false;
		}
		
};

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
	    })
	  }
	  return DOM._loadedHTML[fullPath];
};

function resizeAll() {
	resize();
	resizeTabs();
	ui.extensionBar.resize();
	ui.typingPanel.resize(); 
	ui.browsingEngine.resize();
	ui.processPanel.resize();
	ui.historyPanel.resize();
	ui.dataTableView.resize();
}

function log(str) {
	window.console && console.log && console.log(str);
}

$(document).ready(function(){
		
	LinkedGov._initialise();

});