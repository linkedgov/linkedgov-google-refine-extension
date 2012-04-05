var ClientSideResourceManager = Packages.com.google.refine.ClientSideResourceManager;

/*
 * Function invoked to initialize the extension.
 */
function init() {

	Packages.org.linkedgov.NorthingEastingToLatLong.register();

	ClientSideResourceManager.addPaths(
			"index/scripts",
			module,
			[
			 "scripts/index.js",
			 //"externals/jquery-ui/jquery-ui.min.js",
			 "externals/jquery-ui/jquery-ui.datepicker.js"
			 ]
	);

	ClientSideResourceManager.addPaths(
			"index/styles",
			module,
			[
			 "styles/index.css",
			 "externals/jquery-ui/css/ui-smoothness/jquery-ui-1.8.custom.css",			 
			 //"externals/jquery-ui/smoothness/jquery-ui.css",
			 "externals/jquery-ui/css/jquery-ui.datepicker.less"
			 ]
	);

	ClientSideResourceManager.addPaths(
			"project/scripts",
			module,
			[
			 "scripts/project.js",
			 
			 //"externals/jquery-ui/jquery-ui.min.js",
			 "externals/jquery-ui/jquery-ui.datepicker.js"
			 ]
	);


	ClientSideResourceManager.addPaths(
			"project/styles",
			module,
			[
			 "styles/project.css",
			 "externals/jquery-ui/css/ui-smoothness/jquery-ui-1.8.custom.css",	
			 //"externals/jquery-ui/smoothness/jquery-ui.css",
			 "externals/jquery-ui/css/jquery-ui.datepicker.less"
			 ]
	);
}