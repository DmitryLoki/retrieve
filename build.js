//hello
var requirejs = require('requirejs');
var exec = require('child_process').exec;

var config = {
	//optimize: 'none',
    baseUrl: 'src/js',
    name: 'init',
    out: 'src/n.js',
	include: ['requireLib'],
    paths: {
    	'requireLib': 'require',

		'jquery': 'wild-libs/jquery',
		'jquery-ui': 'wild-libs/jquery-ui',
		'setImmediate': 'wild-libs/setImmediate',
	},
	shim: {
		'jquery': { exports: function(){ return jQuery.noConflict(true); } },
		'jquery-ui': {
			deps: [ 'jquery' ],
			exports: function($){ return $; }
		},
		'setImmediate': { exports: 'window.setImmediate' },
	}
};

requirejs.optimize(config, function(buildRes){
	exec('scp -P 2043 src/n.js devtribune@codecat.ru:~/www/dev.airtribune.com/retrieve/out/', function(err, stdOut, stdErr){
		if(err)
			console.log('ERROR!\n', err);
		else
			console.log(stdOut, '\n', buildRes);
	});
});

//var requirejs = require('requirejs');
//
//var config = {
////	appDir: 'src',
//    baseUrl: './js',
//    name: 'init',
//    out: 'n.js',
//	//include: ['requireLib'],
//	
//	mainConfigFile: 'js/init.js',
////	dir: 'build',
//    paths: {
//    	'requireLib': 'require',
//
////		'underscore': 'wild-libs/underscore',
////		'jquery': 'wild-libs/jquery-1.7.2',
////		'setImmediate': 'wild-libs/setImmediate',
////		'easyXDM': 'wild-libs/easyXDM'
//	}
////	shim: {
////    	'underscore': { exports: function(){ return _.noConflict(); } },
////    	'jquery': { exports: function(){ return jQuery.noConflict(true); } },
////    	'setImmediate': { exports: 'window.setImmediate' },
////    	'easyXDM': { exports: function(){ return easyXDM.noConflict("n.js"); } }
////	}
//};
//
//requirejs.optimize(config, function(buildRes){
//    //buildResponse is just a text output of the modules
//    //included. Load the built file for the contents.
//    //Use config.out to get the optimized file contents.
//    //var contents = fs.readFileSync(config.out, 'utf8');
//	console.log(buildRes);
//});
