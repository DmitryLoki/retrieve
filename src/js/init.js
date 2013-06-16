require.config({
	paths: {
		"jquery": "wild-libs/jquery",
		"jquery-ui": "wild-libs/jquery-ui",
		"setImmediate": "wild-libs/setImmediate",
		"owg": "wild-libs/owg-optimized",
		"domReady": "lib/domReady",
		"knockout": "lib/knockout",
		"knockout.mapping": "lib/knockout.mapping",
		"EventEmitter": "lib/EventEmitter",
		"es5-shim": "lib/es5-shim",
		"jquery.tinyscrollbar": "lib/jquery.tinyscrollbar",
		"jquery.color": "lib/jquery.color",
		"async": "lib/async",
		"text": "lib/require.text",
    	"ie-fix": "wild-libs/ie-fix"
	},
	shim: {
    	"jquery": { exports: function(){ return jQuery.noConflict(true); } },
    	"setImmediate": { exports: "window.setImmediate" }
	},
    config: {
        text: {
            useXhr: function (url, protocol, hostname, port) {
                return true;
            }
        }
    }
});

require(["core", "domReady!", "widget!App"], function(core, doc, App){
	core.appInit(new App, doc);
});
