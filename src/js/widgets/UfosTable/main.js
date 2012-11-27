define(['knockout','widget!Checkbox'], function(ko, Checkbox){
	var UfosTable = function(ufos){
		this.ufos = ufos;
		var self = this;
	    this.allVisibleChecked = ko.computed({
	        read: function(){
	            return !self.ufos().some(function(item){
	                return !item.visibleCheckbox.checked();
	            });
	        },
	        write: function(val){
	        	self.ufos().forEach(function(item){
	        		item.visibleCheckbox.checked(val);
	        	});
	        }
	    });
        this.allVisibleCheckbox = new Checkbox({checked: this.allVisibleChecked, color: 'blue'});
	};

	UfosTable.prototype.domInit = function(elem, params){
	};

	UfosTable.prototype.domDestroy = function(elem, params){
	};
	
	UfosTable.prototype.templates = ['main'];

	return UfosTable;
});
