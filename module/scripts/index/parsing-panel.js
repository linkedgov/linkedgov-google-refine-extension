/*
 * Because we've styled the parsing panel differnetly, 
 * we need to resize the new panels ourselves, to we initiate 
 * this here - once the parsing-panel.js has loaded.
 */
LG.resizeParsingPanel();

/*
 * If the user's screen forced them to scroll down the page when 
 * filling out the metadata form, if they click "Start over" on the 
 * parsing options screen, this will scroll the form to the top.
 */
$("button[bind='startOverButton']").live("click",function(){
	$("div#create-project-ui-source-selection").scrollTop(0);
});