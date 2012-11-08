require.config({
	baseUrl: 'js',
	paths: {
		'jquery': 'wild-libs/jquery-1.8.2.min',
		'jquery-ui': 'wild-libs/jquery-ui-1.9.1.min',
		'setImmediate': 'wild-libs/setImmediate',
		'knockout': 'knockout-2.2.0.min',
		'knockout.mapping': 'knockout.mapping-2.3.3.min'
	},
	shim: {
    	'jquery': { exports: function(){ return jQuery.noConflict(true); } },
    	'jquery-ui': {
    		deps: [ 'jquery' ],
    		exports: function($){ return $; }
    	},
    	'setImmediate': { exports: 'window.setImmediate' },
	}
});

require(['core', 'domReady!', 'widget!App'], function(core, doc, App){
	core.appInit(new App, doc);
});
