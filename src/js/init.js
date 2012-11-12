require.config({
	baseUrl: 'js',
	paths: {
		'jquery': 'wild-libs/jquery',
		'jquery-ui': 'wild-libs/jquery-ui',
		'setImmediate': 'wild-libs/setImmediate'
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
