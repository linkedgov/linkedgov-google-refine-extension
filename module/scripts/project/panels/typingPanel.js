/*
 * LinkedGov UI skin for Google Refine
 * 
 * Author: Dan Smith
 * 
 * The "Typing" panel UI object
 * 
 * Follows the same structure as the facet and history
 * panels.
 * 
 * - Houses column selection functions
 * - Creates the dynamic content for the wizards when selecting columns
 * - Handles all user interaction for the typing panel, it's wizards 
 * and the labels and descriptions panel.
 * - Provides validation for the labels and descriptions panel
 * 
 */

/*
 * Constructor for the typing panel
 */
function TypingPanel(div) {
	this._div = div;
	this._el = DOM.bind(this._div);
	this.update();
}

/*
 * Resize function - similar to the other panels
 * 
 * TODO: Perhaps use CSS instead of a resize function?
 */
TypingPanel.prototype.resize = function () {
	var body = this._div.find(".typing-panel-body");

	var bodyPaddings = body.outerHeight(true) - body.height();
	body.height((this._div.height() - bodyPaddings) + "px");
	body[0].scrollTop = body[0].offsetHeight;
};

/*
 * Update function
 */
TypingPanel.prototype.update = function (onDone) {
	var self = this;
	self._render();
};

TypingPanel.prototype.hidePanels = function(){
	$("div.typing-panel-body").hide();
	$("div.action-bar div.action-buttons").hide();
	$("div.action-bar a.button").hide();
};

/*
 * _render
 * 
 * Sets up the generic user interaction for the typing panel and for the wizards 
 * using "live" event delegation which means injected HTML and newly 
 * appended elements will not need to have event listeners re-applied to them. 
 *
 */
TypingPanel.prototype._render = function () {

	var self = this;

	var elmts = DOM.bind(self._div);

	//ui.typingPanel.loadWizards();

	/*
	 * Typing panel tabs
	 */
	
	$('ul.lg-tabs li a').click(function(){
		if(!$(this).parent("li").hasClass("active")){
			
			$('ul.lg-tabs li').removeClass("inactive");
			$('ul.lg-tabs li').removeClass("active");
			$(this).parent().addClass("active");
			$(this).parent().next().addClass("inactive");
			
			//$("div#intro-message").hide();

			$("div.typing-panel-body").hide();

			$("div#"+$(this).attr("rel")).show(0,function(){

				$("td.column-header").each(function(){
					$(this).removeClass("bad").removeClass("maybe").removeClass("good").removeClass("great");
				});

				if($(this).attr("id") == "wizards-panel"){
					LG.panels.wizardsPanel.displayPanel();
				} else if($(this).attr("id") == "linking-panel"){	
					LG.panels.linkingPanel.displayPanel();
				} else if($(this).attr("id") == "labelling-panel"){
					LG.panels.labellingPanel.displayPanel();
				}

				$(".typing-panel-body").scrollTop(0)

			});
		} else {
			// already on the tab
		}
	});
	

	/*
	 * Add a listener for the "Finish" button
	 * and show it.
	 */
	//elmts.finishButton.click(function(){

	/*
	 * TODO: Make checks to see if the user has visited each panel,
	 * as they might head for the Finish button after just using the wizards/
	 */

	/*
	 * Save all other RDF that needs to be saved
	 */
	//LG.rdfOps.finaliseRDFSchema.init();
	//}).show();

	/*
	 * Called similarly to Refine's panels.
	 */
	this.resize();

	$("div.action-bar a.button.save, div.action-bar a.button.link").hide();
	
	$("#refine-tabs-typing ul.lg-tabs li").eq(0).addClass("active");
	$("#refine-tabs-typing ul.lg-tabs li").eq(1).addClass("inactive");
	$("div#wizards-panel").show();
};

TypingPanel.prototype.showStartMessage = function(){

	$('ul.lg-tabs li').removeClass("active");
	$("div.typing-panel-body").hide();
	$("div#intro-message").show();
	$("div.action-bar").hide();
	$("div.action-bar a.save","div.action-bar a.link").hide();

};
