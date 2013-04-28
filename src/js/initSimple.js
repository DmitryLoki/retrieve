require.config({
	baseUrl: 'http://airvis03.ragneta.com/js',
	paths: {
		'jquery': 'wild-libs/jquery',
		'setImmediate': 'wild-libs/setImmediate',
	},
	shim: {
    	'jquery': { exports: function(){ return jQuery.noConflict(true); } },
    	'setImmediate': { exports: 'window.setImmediate' },
	},
    config: {
        text: {
            useXhr: function (url, protocol, hostname, port) {
                return true;
            }
        }
    }
});

require(['core', 'domReady!', 'widget!AppSimple'], function(core, doc, App) {
	core.appInit(new App, doc);
});