require.config({
	paths: {
		'jquery': 'wild-libs/jquery',
		'jquery-ui': 'wild-libs/jquery-ui',
		'setImmediate': 'wild-libs/setImmediate',
		'owg': 'wild-libs/owg-optimized',
		'jquery.jscrollpane': 'wild-libs/jquery.jscrollpane.min',
		'jquery.mousewheel': 'wild-libs/jquery.mousewheel.min'
	},
	shim: {
    	'jquery': { exports: function(){ return jQuery.noConflict(true); } },
    	'jquery-ui': {
    		deps: [ 'jquery' ],
    		exports: function($){ return $; }
    	},
    	'setImmediate': { exports: 'window.setImmediate' },
        'jquery.jscrollpane': {
            deps: ['jquery','jquery.mousewheel'],
            exports: 'jQuery.fn.jScrollPane'
    	},
    	'jquery.mousewheel': {
    		deps: ['jquery'],
    		exports: 'jQuery.mousewheel'
    	}
	},
    config: {
        text: {
            useXhr: function (url, protocol, hostname, port) {
                return true;
            }
        }
    }
});

require(['core', 'domReady!', 'widget!App'], function(core, doc, App){
	core.appInit(new App, doc);
});
