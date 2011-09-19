LinkedGov.resizeParsingPanel();

$("button[bind='startOverButton']").live("click",function(){
	$("div#create-project-ui-source-selection").scrollTop(0);
})

/*
var parserResizer = function(){
	
	var self = Refine.DefaultImportingController.sources[0].ui._controller;
	//console.log("resizing");
    var elmts = self._parsingPanelElmts;
    var width = self._parsingPanel.width();
    var height = self._parsingPanel.height();
    var headerHeight = elmts.wizardHeader.outerHeight(true);
    var controlPanelHeight = 0; // DS

    elmts.dataPanel
    .css("left", "300px")
    .css("top", headerHeight + "px")
    .css("width", ((width - 305) + "px"))
    .css("height", (height - headerHeight - controlPanelHeight - DOM.getVPaddings(elmts.dataPanel)) + "px");
    elmts.progressPanel
    .css("left", "0px")
    .css("top", headerHeight + "px")
    .css("width", (width - DOM.getHPaddings(elmts.progressPanel)) + "px")
    .css("height", (height - headerHeight - controlPanelHeight - DOM.getVPaddings(elmts.progressPanel)) + "px");
    elmts.controlPanel
    .css("left", "0px")
    .css("top", headerHeight + "px")
    .css("width", "300px")
    .css("height", (height - headerHeight - controlPanelHeight - DOM.getVPaddings(elmts.dataPanel)) + "px"); 
 
  
  	// DS - alter the widths of the td elements that hold the checkboxes & inputs for the parsing panels
	$('td.default-importing-parsing-control-panel-options-panel').children().find('div.grid-layout').children().find('td').each(function(){
		if($(this).attr('width') === "1%"){
	   		$(this).removeAttr('width').css('width','25px');
		}
	});      	
}

Refine.DefaultImportingController.sources[0].ui._controller._parsingPanelResizer = parserResizer();
Refine.DefaultImportingController.sources[1].ui._controller._parsingPanelResizer = parserResizer();
$(window).unbind("resize");
$(window).bind("resize", parserResizer);
*/