define(["knockout"], function(ko) {
	ko.extenders.restrictChangeSpeed = function(target,timeout) {
	    var writeTimeoutInstance = null;
	    var currentValue = target();
	    var updateValueAgain = false;
	    var interceptor;
	    
	    if (ko.isComputed(target) && !ko.isWriteableObservable(target)) {
	        interceptor = ko.observable().extend({ restrictChangeSpeed: timeout });
	        target.subscribe(interceptor);
	        return interceptor;
	    }
	    
	    return ko.dependentObservable({
	        read: target,
	        write: function(value) {
	            // обновляет значение и на секунду проставляет переменную writeTimeoutInstance
	            // если в течение секунды были апдейты, они проставили updateValueAgain в true
	            // тогда вызываем updateValue опять
	            var updateValue = function(value) {
	                target(value);
	                if (!writeTimeoutInstance) {
	                    writeTimeoutInstance = setTimeout(function() {
	                        writeTimeoutInstance = null;
	                        if (updateValueAgain) {
	                            updateValueAgain = false;
	                            updateValue(currentValue);
	                        }
	                    },timeout);
	                }
	            }
	            currentValue = value;
	            if (!writeTimeoutInstance)
	                updateValue(currentValue);
	            else
	                updateValueAgain = true;
	        }
	    });
	}
});