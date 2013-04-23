require.config({
	baseUrl: 'js',
	paths: {
		'jquery': 'wild-libs/jquery',
		'setImmediate': 'wild-libs/setImmediate',
	},
	shim: {
    	'jquery': { exports: function(){ return jQuery.noConflict(true); } },
    	'setImmediate': { exports: 'window.setImmediate' },
	}
});

require(['core', 'domReady!', 'widget!AppSimple'], function(core, doc, App) {
	core.appInit(new App, doc);
});