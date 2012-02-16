[{
	serviceName:"UK government departments",
	serviceType:"sparql",
	endpoint:"http://services.data.gov.uk/reference/sparql",
	hints:["department","organisation"],
	labelURI:"http://www.w3.org/2000/01/rdf-schema#label",
	resourceInfo:{
		resourceURI:"http://reference.data.gov.uk/def/central-government/Department",
		resourceCURIE:"Department",
		predicateURI:"",
		predicateCURIE:"",
		vocabURI:"http://reference.data.gov.uk/def/central-government/",
		vocabCURIE:"gov"
	}
},{
	serviceName:"UK wards & boroughs",
	serviceType:"sparql",
	endpoint:"http://api.talis.com/stores/ordnance-survey/services/sparql",
	hints:["ward","borough"],
	labelURI:"http://www.w3.org/2000/01/rdf-schema#label",
	decriptionURI:"",
	resourceInfo:{
		resourceURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/LondonBoroughWard",
		resourceCURIE:"LondonBoroughWard",
		predicateURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/ward",
		predicateCURIE:"ward",
		vocabURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/",
		vocabCURIE:"admingeo"
	}
},{
	serviceName:"UK parishes",
	serviceType:"sparql",
	endpoint:"http://api.talis.com/stores/ordnance-survey/services/sparql",
	hints:["parish"],
	labelURI:"http://www.w3.org/2000/01/rdf-schema#label",
	descriptionURI:"",
	resourceInfo:{
		resourceURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/CivilParish",
		resourceCURIE:"CivilParish",
		predicateURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/parish",
		predicateCURIE:"parish",
		vocabURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/",
		vocabCURIE:"admingeo"
	}	
},{
	serviceName:"UK counties",
	serviceType:"sparql",
	endpoint:"http://api.talis.com/stores/ordnance-survey/services/sparql",
	hints:["county", "counties"],
	labelURI:"http://www.w3.org/2004/02/skos/core#altLabel",
	resourceInfo:{
		resourceURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/County",
		resourceCURIE:"County",
		predicateURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/county",
		predicateCURIE:"county",
		vocabURI:"http://data.ordnancesurvey.co.uk/ontology/admingeo/",
		vocabCURIE:"admingeo"
	}	
},{
	serviceName:"UK primary & secondary schools",
	serviceType:"sparql",
	endpoint:"http://services.data.gov.uk/education/sparql",
	hints:["school"],
	labelURI:"http://www.w3.org/2000/01/rdf-schema#label",
	descriptionURI:"http://education.data.gov.uk/def/school/address",
	resourceInfo:{
		resourceURI:"http://education.data.gov.uk/def/school/School",
		resourceCURIE:"School",
		predicateURI:"",
		predicateCURIE:"",
		vocabURI:"http://education.data.gov.uk/def/school/",
		vocabCURIE:"school"
	}	
},{
	serviceName:"UK train stations",
	serviceType:"sparql",
	endpoint:"http://services.data.gov.uk/transport/sparql",
	hints:["train","station"],
	labelURI:"http://www.w3.org/2004/02/skos/core#prefLabel",
	resourceInfo:{
		resourceURI:"http://transport.data.gov.uk/def/naptan/Station",
		resourceCURIE:"Station",
		predicateURI:"",
		predicateCURIE:"",
		vocabURI:"http://transport.data.gov.uk/def/naptan/",
		vocabCURIE:"naptan"
	}	
},{
	serviceName:"UK bus stop",
	serviceType:"sparql",
	endpoint:"http://services.data.gov.uk/transport/sparql",
	hints:["stop","bus"],
	labelURI:"http://www.w3.org/2004/02/skos/core#prefLabel",
	resourceInfo:{
		resourceURI:"http://transport.data.gov.uk/def/naptan/BusStopPoint",
		resourceCURIE:"BusStopPoint",
		predicateURI:"",
		predicateCURIE:"",
		vocabURI:"http://transport.data.gov.uk/def/naptan/",
		vocabCURIE:"naptan"
	}	
},{
	serviceName:"UK airports",
	serviceType:"sparql",
	endpoint:"http://services.data.gov.uk/transport/sparql",
	hints:["airport"],
	labelURI:"http://www.w3.org/2004/02/skos/core#prefLabel",
	resourceInfo:{
		resourceURI:"http://transport.data.gov.uk/def/naptan/Airport",
		resourceCURIE:"Airport",
		predicateURI:"",
		predicateCURIE:"",
		vocabURI:"http://transport.data.gov.uk/def/naptan/",
		vocabCURIE:"naptan"
	}	
}]