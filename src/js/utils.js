define(['jquery', 'es5-shim','console-fix'], function($){
	function isWidget(obj){
		return !!obj._widgetName;
	}

	function inherits(ctor, superCtor){
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
		    }
		});
		return ctor;
	}

	function log(){
		if(window.console && console.log){
			switch(arguments.length){
			case 1: console.log(arguments[0]); break;
			case 2: console.log(arguments[0], arguments[1]); break;
			case 3: console.log(arguments[0], arguments[1], arguments[2]); break;
			case 4: console.log(arguments[0], arguments[1], arguments[2], arguments[3]); break;
			default: console.log(Array.prototype.join.call(arguments, ', '));
			}
		}
	}

	return {
		isWidget: isWidget,
		inherits: inherits,
		log: log,
		extend: $.extend
	};
});
